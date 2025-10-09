import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId, assignmentId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID is required' })
    }

    if (!assignmentId || typeof assignmentId !== 'string') {
      return res.status(400).json({ error: 'Assignment ID is required' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user || !['ADMIN', 'OVERSEER', 'admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'DELETE':
        console.log(`🗑️ Removing assignment ${assignmentId} from event ${eventId}`)
        
        // Verify assignment exists and belongs to this event
        const assignment = await prisma.position_assignments.findUnique({
          where: { id: assignmentId },
          include: {
            position: true,
            attendant: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        })

        if (!assignment) {
          console.error(`❌ Assignment not found: ${assignmentId}`)
          return res.status(404).json({ error: 'Assignment not found' })
        }

        if (assignment.position.eventId !== eventId) {
          console.error(`❌ Assignment ${assignmentId} does not belong to event ${eventId}`)
          return res.status(400).json({ error: 'Assignment does not belong to this event' })
        }

        console.log(`📋 Removing ${assignment.attendant.firstName} ${assignment.attendant.lastName} from position ${assignment.position.name}`)

        // Delete the assignment
        await prisma.position_assignments.delete({
          where: { id: assignmentId }
        })

        console.log(`✅ Successfully removed assignment ${assignmentId}`)

        return res.status(200).json({
          success: true,
          message: `Assignment removed successfully`
        })

      default:
        res.setHeader('Allow', ['DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Assignment deletion API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
