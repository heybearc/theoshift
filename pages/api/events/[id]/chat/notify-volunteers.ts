import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isEmailConfigured, sendEmail } from '@/lib/email'
import { generateChatEnabledEmail } from '@/lib/chatEmails'
import { formatCalendarDateLabel } from '@/lib/calendarDate'
import { getEventRosterEmailRecipients } from '@/lib/eventRosterEmail'
import {
  tryAcquireEmailJob,
  bulkEmailJobKey,
  runThrottledBulkEmail,
  estimateBulkEmailDurationSeconds,
  getBulkEmailJob,
} from '@/lib/bulkEmailJob'

const JOB_KIND = 'chat-notify'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId } = req.query
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

  if (!actor || !['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(actor.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' })
  }

  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, startDate: true, endDate: true },
  })

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }

  const recipients = await getEventRosterEmailRecipients(eventId)
  const recipientCount = recipients.length
  const estimatedSeconds = estimateBulkEmailDurationSeconds(recipientCount)
  const jobKey = bulkEmailJobKey(eventId, JOB_KIND)
  const existing = getBulkEmailJob(jobKey)

  if (req.method === 'GET' || req.body?.preview === true || req.query.preview === '1') {
    return res.status(200).json({
      success: true,
      preview: true,
      recipientCount,
      estimatedSeconds,
      scope: 'volunteers_roster',
      scopeNote: 'Only Volunteers roster (excludes IVS-only imports)',
      job: existing && !existing.done ? existing : null,
    })
  }

  const emailReady = await isEmailConfigured()
  if (!emailReady) {
    return res.status(400).json({ success: false, error: 'Email is not configured' })
  }

  if (recipientCount === 0) {
    return res.status(200).json({
      success: true,
      sent: 0,
      failed: 0,
      message: 'No roster volunteers with email found for this event',
    })
  }

  if (!tryAcquireEmailJob(jobKey)) {
    return res.status(409).json({
      success: false,
      error:
        'A chat-notify email job is already running for this event. Wait or abort it first.',
      job: getBulkEmailJob(jobKey),
    })
  }

  const customMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  const baseUrl = process.env.NEXTAUTH_URL || 'https://theoshift.com'
  const dashboardUrl = `${baseUrl}/volunteer/dashboard?eventId=${event.id}`
  const startDate = event.startDate
    ? formatCalendarDateLabel(event.startDate.toISOString())
    : undefined
  const endDate = event.endDate ? formatCalendarDateLabel(event.endDate.toISOString()) : undefined
  const eventName = event.name
  const recipientsSnapshot = recipients.map((r) => ({ ...r }))

  void runThrottledBulkEmail({
    eventId,
    kind: JOB_KIND,
    recipients: recipientsSnapshot,
    sendOne: async (recipient) => {
      const html = generateChatEnabledEmail({
        firstName: recipient.firstName || 'Volunteer',
        eventName,
        eventStartDate: startDate || undefined,
        eventEndDate: endDate || undefined,
        dashboardUrl,
        customMessage: customMessage || undefined,
      })
      await sendEmail({
        to: recipient.email,
        subject: `Event chat is now available for ${eventName}`,
        html,
      })
    },
  }).then((snap) => {
    console.log(
      `[chat-notify] event=${eventId} done sent=${snap.sent} failed=${snap.failed} aborted=${snap.aborted}`
    )
  })

  return res.status(202).json({
    success: true,
    async: true,
    job: JOB_KIND,
    recipientCount,
    estimatedSeconds,
    message: `Queued chat launch email to ${recipientCount} roster volunteer${
      recipientCount === 1 ? '' : 's'
    } (~${Math.ceil(estimatedSeconds / 60)} min at Gmail-safe pace). You can Abort from Chat if needed.`,
  })
}
