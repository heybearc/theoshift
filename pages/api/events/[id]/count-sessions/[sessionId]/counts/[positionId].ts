import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId, sessionId, positionId } = req.query
    if (!eventId || typeof eventId !== 'string' || !sessionId || typeof sessionId !== 'string' || !positionId || typeof positionId !== 'string') {
      return res.status(400).json({ error: 'Event ID, Session ID, and Position ID are required' })
    }

    switch (req.method) {
      case 'DELETE':
        // Delete the position count for this session
        await prisma.position_counts.deleteMany({
          where: {
            countSessionId: sessionId,
            positionId: positionId
          }
        })

        return res.status(200).json({
          success: true,
          message: 'Count deleted successfully'
        })

      default:
        res.setHeader('Allow', ['DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Count delete API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
