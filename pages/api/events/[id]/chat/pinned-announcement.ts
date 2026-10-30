import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { blockSimulatedMutation, getViewAsVolunteerId } from '@/lib/countAssignments'
import {
  acknowledgePinnedAnnouncement,
  getUnacknowledgedPinnedAnnouncement,
  resolveDashboardVolunteerId
} from '@/lib/pinnedAnnouncement'

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

  const viewAsVolunteerId = getViewAsVolunteerId(req)
  const volunteer = await resolveDashboardVolunteerId(eventId, session.user.email, viewAsVolunteerId)
  if (!volunteer) {
    return res.status(403).json({ success: false, error: 'Access denied for event chat' })
  }

  if (req.method === 'GET') {
    const announcement = await getUnacknowledgedPinnedAnnouncement(eventId, volunteer.volunteerId)
    return res.status(200).json({
      success: true,
      data: announcement
        ? { ...announcement, simulated: volunteer.simulated }
        : null
    })
  }

  if (blockSimulatedMutation(req, res)) return

  const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId.trim() : ''
  if (!messageId) {
    return res.status(400).json({ success: false, error: 'Message ID is required' })
  }

  const result = await acknowledgePinnedAnnouncement(eventId, volunteer.volunteerId, messageId)
  if (!result.ok) {
    return res.status(409).json({ success: false, error: result.error })
  }

  return res.status(200).json({ success: true })
}
