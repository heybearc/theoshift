import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id: eventId } = req.query

  if (req.method === 'POST') {
    try {
      // Delete all attendant assignments for this event
      const result = await prisma.position_assignments.deleteMany({
        where: {
          position: {
            eventId: eventId as string
          },
          role: 'ATTENDANT'
        }
      })

      return res.status(200).json({
        success: true,
        deletedCount: result.count,
        message: `Cleared ${result.count} assignments`
      })
    } catch (error) {
      console.error('Clear assignments error:', error)
      return res.status(500).json({ error: 'Failed to clear assignments' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
