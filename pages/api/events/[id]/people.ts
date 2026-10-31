import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { eventUsesIvsCheckIn, listArrivals } from '@/lib/arrivals'

const STAFF_ROLES = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const session = await getApiSession(req, res)
  if (!session?.user?.id || !STAFF_ROLES.includes(session.user.role || '')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const eventId = typeof req.query.id === 'string' ? req.query.id : ''
  const focusId = typeof req.query.focusId === 'string' ? req.query.focusId : ''
  if (!eventId || !focusId) {
    return res.status(400).json({ success: false, error: 'Event and keyman or overseer are required' })
  }

  const includeCheckIn = await eventUsesIvsCheckIn(eventId)
  const result = await listArrivals(eventId, focusId, { includeCheckIn })
  if (!result) {
    return res.status(403).json({ success: false, error: 'That person is not a keyman or overseer on this event' })
  }

  return res.status(200).json({ success: true, ...result })
}
