import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { generateAssignmentCreatedEmail } from '../../../../../src/lib/assignmentEmails'
import { canManageAssignments } from '../../../../../src/lib/eventAccess'
import { isEmailConfigured, sendEmail } from '@/lib/email'
import {
  tryAcquireEmailJob,
  runThrottledBulkEmail,
  estimateBulkEmailDurationSeconds,
  getBulkEmailJob,
  bulkEmailJobKey,
  uniqueByEmail,
} from '@/lib/bulkEmailJob'

const JOB_KIND = 'assignment-notifications'

type PreparedRecipient = {
  id: string
  email: string
  firstName: string
  lastName: string
  subject: string
  html: string
}

/**
 * Bulk assignment notifications — one email per assigned volunteer (throttled + abortable).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId } = req.query
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' },
    })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    if (!(await canManageAssignments(user.id, eventId))) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    if (req.method === 'GET') {
      const assignments = await prisma.position_assignments.findMany({
        where: { positions: { eventId } },
        select: {
          volunteerId: true,
          volunteer: {
            select: {
              email: true,
              user: { select: { email: true } },
            },
          },
        },
      })
      const byVolunteer = new Map<string, string>()
      for (const a of assignments) {
        if (!a.volunteerId || byVolunteer.has(a.volunteerId)) continue
        const email = (a.volunteer?.user?.email || a.volunteer?.email || '').trim()
        if (email) byVolunteer.set(a.volunteerId, email)
      }
      const recipientCount = byVolunteer.size
      return res.status(200).json({
        success: true,
        recipientCount,
        estimatedSeconds: estimateBulkEmailDurationSeconds(recipientCount),
      })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const emailReady = await isEmailConfigured()
    if (!emailReady) {
      return res.status(400).json({
        success: false,
        error: 'Email is not configured',
      })
    }

    const settingsRecord = await prisma.system_settings.findFirst({
      where: { key: 'notification_settings' },
    })

    let notificationsEnabled = true
    if (settingsRecord?.value) {
      try {
        const settings = JSON.parse(settingsRecord.value as string)
        notificationsEnabled = settings.assignmentCreated !== false
      } catch (e) {
        console.error('Failed to parse notification settings:', e)
      }
    }

    if (!notificationsEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Notifications disabled',
        message: 'Assignment notifications are disabled in settings',
      })
    }

    const assignments = await prisma.position_assignments.findMany({
      where: { positions: { eventId } },
      include: {
        volunteer: { include: { user: true } },
        positions: { include: { events: true } },
        shift: true,
        overseer: { include: { user: true } },
      },
      orderBy: { assignedAt: 'asc' },
    })

    if (assignments.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No assignments to notify',
      })
    }

    const preparedByVolunteer = new Map<string, PreparedRecipient>()
    for (const assignment of assignments) {
      if (!assignment.volunteerId || preparedByVolunteer.has(assignment.volunteerId)) continue
      const volunteer = assignment.volunteer
      if (!volunteer) continue

      const volunteerEmail = (volunteer.user?.email || volunteer.email || '').trim()
      if (!volunteerEmail) continue

      const volunteerFirstName = volunteer.user?.firstName || volunteer.firstName
      const volunteerLastName = volunteer.user?.lastName || volunteer.lastName
      const event = assignment.positions.events

      const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const overseer = assignment.overseer
      const overseerName = overseer
        ? `${overseer.user?.firstName || overseer.firstName} ${overseer.user?.lastName || overseer.lastName}`
        : undefined
      const overseerEmail = overseer
        ? overseer.user?.email || overseer.email || undefined
        : undefined
      const overseerPhone = overseer
        ? overseer.user?.phone || overseer.phone || undefined
        : undefined

      const html = generateAssignmentCreatedEmail({
        volunteerFirstName,
        volunteerLastName,
        volunteerEmail,
        eventName: event.name,
        eventDate,
        eventLocation: event.location || event.venue || 'Location TBD',
        positionName: assignment.positions.name,
        positionNumber: assignment.positions.positionNumber,
        shiftName: assignment.shift?.name,
        shiftStart: assignment.shift?.startTime || '',
        shiftEnd: assignment.shift?.endTime || '',
        isAllDay: assignment.shift?.isAllDay || false,
        overseerName,
        overseerEmail,
        overseerPhone: overseerPhone ?? undefined,
        eventUrl: `${process.env.NEXTAUTH_URL}/events/${event.id}/positions-next`,
      })

      preparedByVolunteer.set(assignment.volunteerId, {
        id: assignment.volunteerId,
        email: volunteerEmail,
        firstName: volunteerFirstName,
        lastName: volunteerLastName,
        subject: `Your assignment for ${event.name}`,
        html,
      })
    }

    const prepared = uniqueByEmail([...preparedByVolunteer.values()])
    if (prepared.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No assigned volunteers with an email address.',
      })
    }

    const jobKey = bulkEmailJobKey(eventId, JOB_KIND)
    if (!tryAcquireEmailJob(jobKey)) {
      return res.status(409).json({
        success: false,
        error:
          'An email blast is already in progress for this event. Wait or abort it first.',
        job: getBulkEmailJob(jobKey),
      })
    }

    const htmlByEmail = new Map(prepared.map((r) => [r.email.toLowerCase(), r]))
    const n = prepared.length
    const estimatedSeconds = estimateBulkEmailDurationSeconds(n)

    void runThrottledBulkEmail({
      eventId,
      kind: JOB_KIND,
      recipients: prepared.map((r) => ({
        id: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
      })),
      sendOne: async (recipient) => {
        const full = htmlByEmail.get(recipient.email.toLowerCase())
        if (!full) throw new Error('Prepared email missing for recipient')
        await sendEmail({
          to: full.email,
          subject: full.subject,
          html: full.html,
        })
      },
    }).then((snap) => {
      console.log(
        `[assignment-notifications] event=${eventId} done sent=${snap.sent} failed=${snap.failed} aborted=${snap.aborted}`
      )
    })

    return res.status(202).json({
      success: true,
      async: true,
      job: JOB_KIND,
      recipientCount: n,
      estimatedSeconds,
      message: `Queued ${n} recipient${n === 1 ? '' : 's'} (~${Math.ceil(
        estimatedSeconds / 60
      )} min at Gmail-safe pace). Abort from Positions if needed — do not click Send again.`,
    })
  } catch (error: unknown) {
    console.error('[assignment-notifications]', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
