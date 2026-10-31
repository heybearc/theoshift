import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { getApiSession } from '@/lib/apiSession'
import { canAccessEventChat } from '@/lib/chatAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId } = req.query
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  const session = await getApiSession(req, res)
  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const viewAsVolunteerId =
    typeof req.headers['x-view-as-volunteer-id'] === 'string' ? req.headers['x-view-as-volunteer-id'] : null
  const access = await canAccessEventChat(eventId, session.user.email, { viewAsVolunteerId })
  if (!access.allowed) {
    return res.status(403).json({ success: false, error: 'Access denied for event chat' })
  }

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server misconfigured (NEXTAUTH_SECRET missing)' })
  }

  const token = jwt.sign(
    {
      v: 1,
      eventId,
      email: session.user.email,
      viewAsVolunteerId: viewAsVolunteerId || null
    },
    secret,
    { expiresIn: '5m' }
  )

  return res.status(200).json({ success: true, data: { token, expiresInSeconds: 300 } })
}

