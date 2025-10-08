import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for assignment creation
const assignmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  positionId: z.string().min(1, 'Position ID is required'),
  shiftStart: z.string().min(1, 'Shift start is required'),
  shiftEnd: z.string().min(1, 'Shift end is required'),
  notes: z.string().optional(),
  eventId: z.string().optional() // Allow eventId in body
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID is required' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user || !['ADMIN', 'OVERSEER', 'admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        const assignments = await prisma.assignments.findMany({
          where: { eventId: eventId },
          orderBy: { createdAt: 'desc' }
        })

        return res.status(200).json({
          success: true,
          data: assignments,
          total: assignments.length
        })

      case 'POST':
        console.log('Assignment creation request body:', req.body)
        const validatedData = assignmentSchema.parse(req.body)
        console.log('Validated assignment data:', validatedData)
        
        const newAssignment = await prisma.assignments.create({
          data: {
            id: crypto.randomUUID(),
            eventId: eventId,
            userId: validatedData.userId,
            positionId: validatedData.positionId,
            shiftStart: validatedData.shiftStart,
            shiftEnd: validatedData.shiftEnd,
            status: 'ASSIGNED',
            notes: validatedData.notes,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return res.status(201).json({
          success: true,
          data: newAssignment,
          message: 'Assignment created successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event Assignments API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
