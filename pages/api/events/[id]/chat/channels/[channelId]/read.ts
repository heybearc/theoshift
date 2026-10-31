import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import { canAccessChatChannel } from '@/lib/chatAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId, channelId } = req.query
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }
  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ success: false, error: 'Channel ID is required' })
  }

  const session = await getApiSession(req, res)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const viewAsVolunteerId =
    typeof req.headers['x-view-as-volunteer-id'] === 'string' ? req.headers['x-view-as-volunteer-id'] : null
  const access = await canAccessChatChannel(eventId, channelId, session.user.email, { viewAsVolunteerId })
  if (!access.allowed || !access.actor) {
    return res.status(403).json({ success: false, error: 'Access denied for this channel' })
  }

  const now = new Date()
  const lastReadMessageId = typeof req.body?.lastReadMessageId === 'string' ? req.body.lastReadMessageId : null

  await prisma.event_chat_reads.upsert({
    where:
      access.actor.kind === 'user'
        ? { channelId_userId: { channelId, userId: access.actor.id } }
        : { channelId_volunteerId: { channelId, volunteerId: access.actor.id } },
    create:
      access.actor.kind === 'user'
        ? { channelId, userId: access.actor.id, lastReadAt: now, lastReadMessageId }
        : { channelId, volunteerId: access.actor.id, lastReadAt: now, lastReadMessageId },
    update: {
      lastReadAt: now,
      ...(lastReadMessageId ? { lastReadMessageId } : {})
    }
  })

  return res.status(200).json({ success: true })
}

