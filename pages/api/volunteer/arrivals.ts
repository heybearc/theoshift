import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { listArrivals } from '@/lib/arrivals'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const session = await getApiSession(req, res)
  if (!session?.user?.id || session.user.role !== 'VOLUNTEER') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : ''
  if (!eventId) {
    return res.status(400).json({ success: false, error: 'Event ID required' })
  }

  const result = await listArrivals(eventId, session.user.id)
  if (!result) {
    return res.status(403).json({ success: false, error: 'Not authorized to view arrivals' })
  }

  return res.status(200).json({ success: true, ...result })
}
