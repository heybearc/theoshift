import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for assignment updates
const updateAssignmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(),
  positionId: z.string().min(1, 'Position ID is required').optional(),
  shiftStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format').optional(),
  shiftEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format').optional(),
  status: z.enum(['ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, assignmentId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (!assignmentId || typeof assignmentId !== 'string') {
    return res.status(400).json({ error: 'Assignment ID is required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user has admin or overseer role
  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { id: true, role: true }
  })

  if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId, assignmentId)
      case 'PUT':
        return await handlePut(req, res, eventId, assignmentId, user.id)
      case 'DELETE':
        return await handleDelete(req, res, eventId, assignmentId, user.role)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Assignment API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, assignmentId: string) {
  const assignment = await prisma.assignments.findUnique({
    where: { id: assignmentId },
    include: {
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true
        }
      },
      event_positions: {
        select: {
          id: true,
          positionNumber: true,
          positionName: true,
          department: true,
          description: true,
          
          
        }
      },
      events: {
        select: {
          id: true,
          name: true,
          eventType: true,
          startDate: true,
          endDate: true,
          
          
        }
      }
    }
  })

  if (!assignment || assignment.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found' })
  }

  // Get other assignments for this user in this event (for conflict checking)
  const userAssignments = await prisma.assignments.findMany({
    where: {
      eventId: eventId,
      userId: assignment.userId,
      id: { not: assignmentId }
    },
    include: {
      event_positions: {
        select: {
          positionNumber: true,
          positionName: true,
          department: true
        }
      }
    },
  })

  // Get other assignments for this position (for workload analysis)
  const positionAssignments = await prisma.assignments.findMany({
    where: {
      eventId: eventId,
      positionId: assignment.positionId,
      id: { not: assignmentId }
    },
    include: {
      users: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
  })

  return res.status(200).json({
    success: true,
    data: {
      assignment,
      userAssignments,
      positionAssignments
    }
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, assignmentId: string, userId: string) {
  // Check if assignment exists
  const existingAssignment = await prisma.assignments.findUnique({
    where: { id: assignmentId }
  })

  if (!existingAssignment || existingAssignment.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found' })
  }

  // Validate request body
  const validation = updateAssignmentSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // If changing user, verify new user is associated with event
  if (data.userId && data.userId !== existingAssignment.userId) {
    const attendantAssociation = await prisma.event_attendant_associations.findUnique({
      where: {
        eventId_userId: {
          eventId: eventId,
          userId: data.userId
        }
      }
    })

    if (!attendantAssociation) {
      return res.status(400).json({ 
        error: 'New user is not associated with this event' 
      })
    }
  }

  // If changing position, verify position exists and is active
  if (data.positionId && data.positionId !== existingAssignment.positionId) {
    const position = await prisma.event_positions.findUnique({
      where: { id: data.positionId }
    })

    if (!position || position.eventId !== eventId || !position.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive position' })
    }
  }

  // Check for time conflicts if changing times or user
  const checkUserId = data.userId || existingAssignment.userId
  const checkShiftStart = data.shiftStart || existingAssignment.shiftStart
  const checkShiftEnd = data.shiftEnd || existingAssignment.shiftEnd

  if (data.userId || data.shiftStart || data.shiftEnd) {
    const conflictingAssignments = await prisma.assignments.findMany({
      where: {
        eventId: eventId,
        userId: checkUserId,
        id: { not: assignmentId },
        OR: [
          {
            AND: [
              { shiftStart: { lte: checkShiftStart } },
              { shiftEnd: { gt: checkShiftStart } }
            ]
          },
          {
            AND: [
              { shiftStart: { lt: checkShiftEnd } },
              { shiftEnd: { gte: checkShiftEnd } }
            ]
          },
          {
            AND: [
              { shiftStart: { gte: checkShiftStart } },
              { shiftEnd: { lte: checkShiftEnd } }
            ]
          }
        ]
      }
    })

    if (conflictingAssignments.length > 0) {
      return res.status(400).json({
        error: 'User has conflicting assignment during this time period',
        details: { conflictingAssignments: conflictingAssignments.length }
      })
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date()
  }

  if (data.userId !== undefined) updateData.userId = data.userId
  if (data.positionId !== undefined) updateData.positionId = data.positionId
  if (data.shiftStart !== undefined) updateData.shiftStart = data.shiftStart
  if (data.shiftEnd !== undefined) updateData.shiftEnd = data.shiftEnd
  if (data.status !== undefined) updateData.status = data.status
  if (data.notes !== undefined) updateData.notes = data.notes

  // Update assignment
  const assignment = await prisma.assignments.update({
    where: { id: assignmentId },
    data: updateData,
    include: {
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      },
      event_positions: {
        select: {
          id: true,
          positionNumber: true,
          positionName: true,
          department: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: assignment,
    message: 'Assignment updated successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, assignmentId: string, userRole: string) {
  // Check if assignment exists
  const existingAssignment = await prisma.assignments.findUnique({
    where: { id: assignmentId }
  })

  if (!existingAssignment || existingAssignment.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found' })
  }

  // Only allow deletion if assignment is not completed
  if (existingAssignment.status === 'COMPLETED') {
    return res.status(400).json({
      error: 'Cannot delete completed assignments'
    })
  }

  // Delete assignment
  await prisma.assignments.delete({
    where: { id: assignmentId }
  })

  return res.status(200).json({
    success: true,
    message: 'Assignment deleted successfully'
  })
}
