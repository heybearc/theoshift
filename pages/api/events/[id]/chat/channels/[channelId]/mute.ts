import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { canAccessChatChannel } from '@/lib/chatAccess'
import { checkEventAccess } from '@/lib/eventAccess'

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

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const viewAsVolunteerId =
    typeof req.headers['x-view-as-volunteer-id'] === 'string' ? req.headers['x-view-as-volunteer-id'] : null
  const access = await canAccessChatChannel(eventId, channelId, session.user.email, { viewAsVolunteerId })
  if (!access.allowed || !access.actor || access.actor.kind !== 'user') {
    return res.status(403).json({ success: false, error: 'Staff access required' })
  }

  const isSystemStaff = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(access.actor.role)
  const eventPermission = await checkEventAccess(access.actor.id, eventId, 'COORDINATOR')
  const isEventStaff = !!eventPermission && ['ADMIN', 'COORDINATOR', 'SUPPORT'].includes(eventPermission.role)
  if (!isSystemStaff && !isEventStaff) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions to mute members' })
  }

  const targetKind = req.body?.targetKind
  const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId : ''
  const durationMinutes = Number.isFinite(Number(req.body?.durationMinutes))
    ? Math.max(1, Math.min(7 * 24 * 60, Number(req.body.durationMinutes)))
    : 60

  if (!targetId || (targetKind !== 'user' && targetKind !== 'volunteer')) {
    return res.status(400).json({ success: false, error: 'targetKind and targetId are required' })
  }

  const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000)

  await prisma.event_chat_members.upsert({
    where:
      targetKind === 'user'
        ? { channelId_userId: { channelId, userId: targetId } }
        : { channelId_volunteerId: { channelId, volunteerId: targetId } },
    create:
      targetKind === 'user'
        ? { channelId, userId: targetId, role: 'MEMBER', mutedUntil }
        : { channelId, volunteerId: targetId, role: 'MEMBER', mutedUntil },
    update: { mutedUntil }
  })

  return res.status(200).json({
    success: true,
    data: { targetKind, targetId, mutedUntil: mutedUntil.toISOString(), durationMinutes }
  })
}
