import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isEmailConfigured, sendEmail } from '@/lib/email'
import {
  generateVolunteerBroadcastEmail,
  formatPlainMessageAsHtml,
} from '@/lib/volunteerBroadcastEmail'
import { formatCalendarDateLabel } from '@/lib/calendarDate'
import {
  tryAcquireEmailJob,
  runThrottledBulkEmail,
  estimateBulkEmailDurationSeconds,
  getBulkEmailJob,
} from '@/lib/bulkEmailJob'
import { volunteerRosterWhere } from '@/lib/volunteerRoster'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleBroadcastEmail(req, res)
  } catch (err: unknown) {
    console.error('[broadcast-email]', err)
    const msg = err instanceof Error ? err.message : 'Server error'
    return res.status(500).json({ success: false, error: msg })
  }
}

async function handleBroadcastEmail(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const eventId = req.query.id
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const actor = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (
    !actor ||
    !['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(actor.role)
  ) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' })
  }

  const emailReady = await isEmailConfigured()
  if (!emailReady) {
    return res.status(400).json({ success: false, error: 'Email is not configured' })
  }

  const scope = req.body?.scope as string | undefined
  const subjectRaw = typeof req.body?.subject === 'string' ? req.body.subject.trim() : ''
  const messageRaw = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  const associationIdsRaw = Array.isArray(req.body?.associationIds)
    ? (req.body.associationIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : []
  const associationIds = [...new Set(associationIdsRaw)]

  if (scope !== 'selected' && scope !== 'all_active') {
    return res.status(400).json({ success: false, error: 'Invalid scope' })
  }
  const subjectSafe = subjectRaw.replace(/[\r\n]+/g, ' ').slice(0, 200)
  if (!subjectSafe) {
    return res.status(400).json({ success: false, error: 'Subject is required (max 200 characters)' })
  }
  if (!messageRaw || messageRaw.length > 15000) {
    return res.status(400).json({
      success: false,
      error: 'Message is required (max 15000 characters)',
    })
  }

  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, startDate: true, endDate: true },
  })

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }

  const baseUrl = process.env.NEXTAUTH_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
  const dashboardUrl = `${baseUrl}/volunteer/dashboard?eventId=${event.id}`
  const startDate = event.startDate ? formatCalendarDateLabel(event.startDate.toISOString()) : undefined
  const endDate = event.endDate ? formatCalendarDateLabel(event.endDate.toISOString()) : undefined
  const messageHtml = formatPlainMessageAsHtml(messageRaw)

  let memberships: {
    id?: string
    volunteerId?: string | null
    volunteer: { firstName: string; email: string } | null
  }[]

  if (scope === 'all_active') {
    // Match Volunteers page: roster membership + active profile
    memberships = await prisma.event_volunteers.findMany({
      where: {
        eventId,
        isActive: true,
        volunteerId: { not: null },
        ...volunteerRosterWhere,
        volunteer: { isActive: true },
      },
      select: {
        volunteer: { select: { firstName: true, email: true } },
      },
    })
  } else {
    if (associationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No volunteers selected',
      })
    }
    // Client may send event_volunteers.id OR volunteers.id (SSR uses volunteer id when join row missing)
    memberships = await prisma.event_volunteers.findMany({
      where: {
        eventId,
        volunteerId: { not: null },
        ...volunteerRosterWhere,
        OR: [{ id: { in: associationIds } }, { volunteerId: { in: associationIds } }],
      },
      select: {
        id: true,
        volunteerId: true,
        volunteer: { select: { firstName: true, email: true } },
      },
    })

    const matchedKeys = new Set<string>()
    for (const m of memberships) {
      if (m.id && associationIds.includes(m.id)) matchedKeys.add(m.id)
      if (m.volunteerId && associationIds.includes(m.volunteerId)) matchedKeys.add(m.volunteerId)
    }
    const unmatched = associationIds.filter((id) => !matchedKeys.has(id))
    if (unmatched.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          'Some selected volunteers are not on this event roster. Refresh the page and try again.',
      })
    }
  }

  type Recipient = { firstName: string; email: string }
  const volunteerKey = (v: { email: string } | null) => v?.email?.trim().toLowerCase() ?? ''
  const rawRecipients = memberships
    .map((m) => m.volunteer)
    .filter((v): v is Recipient => !!v?.email?.trim())

  const seen = new Set<string>()
  const uniqueRecipients = rawRecipients.filter((r) => {
    const key = volunteerKey(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (uniqueRecipients.length === 0) {
    return res.status(200).json({
      success: true,
      sent: 0,
      failed: 0,
      message: 'No volunteers with an email address matched this send.',
    })
  }

  const JOB_KIND = 'broadcast'
  const jobKey = `${JOB_KIND}:${eventId}`
  if (!tryAcquireEmailJob(jobKey)) {
    return res.status(409).json({
      success: false,
      error:
        'An email blast is already in progress for this event. Wait or abort it first.',
      job: getBulkEmailJob(jobKey),
    })
  }

  const eventName = event.name
  const recipientsSnapshot = uniqueRecipients.map((r) => ({ ...r }))
  const n = uniqueRecipients.length
  const estimatedSeconds = estimateBulkEmailDurationSeconds(n)

  void runThrottledBulkEmail({
    eventId,
    kind: JOB_KIND,
    recipients: recipientsSnapshot,
    sendOne: async (recipient) => {
      const html = generateVolunteerBroadcastEmail({
        firstName: recipient.firstName || 'Volunteer',
        eventName,
        eventStartDate: startDate,
        eventEndDate: endDate,
        dashboardUrl,
        messageHtml,
      })
      await sendEmail({
        to: recipient.email,
        subject: subjectSafe,
        html,
      })
    },
  }).then((snap) => {
    console.log(
      `[broadcast-email] event=${eventId} done sent=${snap.sent} failed=${snap.failed} aborted=${snap.aborted}`
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
    )} min at Gmail-safe pace). Watch for bounce notices. Abort from Volunteers if needed — do not click Send again.`,
  })
}
