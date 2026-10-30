import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import {
  abortBulkEmailJob,
  bulkEmailJobKey,
  getBulkEmailJob,
} from '@/lib/bulkEmailJob'

async function requireStaff(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return null
  }
  const actor = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })
  if (
    !actor ||
    !['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(actor.role)
  ) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' })
    return null
  }
  return actor
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const eventId = req.query.id
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  const actor = await requireStaff(req, res)
  if (!actor) return

  const kindRaw =
    typeof req.query.job === 'string'
      ? req.query.job
      : typeof req.body?.job === 'string'
        ? req.body.job
        : ''
  const kind = kindRaw.trim()
  if (!kind) {
    return res.status(400).json({ success: false, error: 'job is required (e.g. chat-notify)' })
  }

  const key = bulkEmailJobKey(eventId, kind)

  if (req.method === 'GET') {
    const snap = getBulkEmailJob(key)
    if (!snap) {
      return res.status(200).json({ success: true, active: false, job: null })
    }
    return res.status(200).json({
      success: true,
      active: !snap.done,
      job: snap,
    })
  }

  if (req.method === 'POST') {
    const action = typeof req.body?.action === 'string' ? req.body.action : 'abort'
    if (action !== 'abort') {
      return res.status(400).json({ success: false, error: 'Unknown action' })
    }
    const ok = abortBulkEmailJob(key)
    const snap = getBulkEmailJob(key)
    return res.status(200).json({
      success: true,
      aborted: ok,
      job: snap,
      message: ok
        ? 'Abort requested — sending will stop after the current email.'
        : 'No active job to abort for this event.',
    })
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
