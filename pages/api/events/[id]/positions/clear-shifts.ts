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
      // First, delete all assignments related to shifts in this event
      const assignmentsResult = await prisma.position_assignments.deleteMany({
        where: {
          position: {
            eventId: eventId as string
          },
          shiftId: {
            not: null
          }
        }
      })

      // Then, delete all shifts for positions in this event
      const shiftsResult = await prisma.position_shifts.deleteMany({
        where: {
          position: {
            eventId: eventId as string
          }
        }
      })

      return res.status(200).json({
        success: true,
        deletedShifts: shiftsResult.count,
        deletedAssignments: assignmentsResult.count,
        message: `Cleared ${shiftsResult.count} shifts and ${assignmentsResult.count} assignments`
      })
    } catch (error) {
      console.error('Clear shifts error:', error)
      return res.status(500).json({ error: 'Failed to clear shifts' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
