import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for position updates
const updatePositionSchema = z.object({
  positionNumber: z.number().int().positive('Position number must be positive').optional(),
  title: z.string().min(1, 'Position title is required').max(255).optional(),
  department: z.string().min(1, 'Department is required').max(100).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  skillsRequired: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, positionId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (!positionId || typeof positionId !== 'string') {
    return res.status(400).json({ error: 'Position ID is required' })
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
        return await handleGet(req, res, eventId, positionId)
      case 'PUT':
        return await handlePut(req, res, eventId, positionId, user.id)
      case 'DELETE':
        return await handleDelete(req, res, eventId, positionId, user.role)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Position API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string) {
  const position = await prisma.event_positions.findUnique({
    where: { id: positionId },
    include: {
      events: {
        select: {
          id: true,
          name: true,
          eventType: true,
          startDate: true,
          endDate: true
        }
      },
      position_shifts: {
      },
      assignments: {
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
      },
      }
    }
  })

  if (!position || position.eventId !== eventId) {
    return res.status(404).json({ error: 'Position not found' })
  }

  return res.status(200).json({
    success: true,
    data: position
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string, userId: string) {
  // Check if position exists
  const existingPosition = await prisma.event_positions.findUnique({
    where: { id: positionId }
  })

  if (!existingPosition || existingPosition.eventId !== eventId) {
    return res.status(404).json({ error: 'Position not found' })
  }

  // Validate request body
  const validation = updatePositionSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if position number is being changed and if it conflicts
  if (data.positionNumber && data.positionNumber !== existingPosition.positionNumber) {
    const conflictingPosition = await prisma.event_positions.findUnique({
      where: {
        eventId_positionNumber: {
          eventId: eventId,
          positionNumber: data.positionNumber
        }
      }
    })

    if (conflictingPosition) {
      return res.status(400).json({
        error: `Position number ${data.positionNumber} already exists for this event`
      })
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date()
  }

  if (data.positionNumber !== undefined) updateData.positionNumber = data.positionNumber
  if (data.positionName !== undefined) updateData.positionName = data.positionName
  if (data.department !== undefined) updateData.department = data.department
  if (data.description !== undefined) updateData.description = data.description
  if (data.requirements !== undefined) updateData.requirements = data.requirements
  if (data.skillsRequired !== undefined) updateData.skillsRequired = data.skillsRequired
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  // Update position
  const position = await prisma.event_positions.update({
    where: { id: positionId },
    data: updateData,
    include: {
      position_shifts: true,
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: position,
    message: 'Position updated successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string, userRole: string) {
  // Only admins can delete positions
  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only administrators can delete positions' })
  }

  // Check if position exists
  const existingPosition = await prisma.event_positions.findUnique({
    where: { id: positionId },
    include: {
      }
    }
  })

  if (!existingPosition || existingPosition.eventId !== eventId) {
    return res.status(404).json({ error: 'Position not found' })
  }

  // Check if position has assignments (prevent deletion if it does)
  if (existingPosition._count.assignments > 0) {
    return res.status(400).json({
      error: 'Cannot delete position with existing assignments. Please remove all assignments first.',
      details: { assignmentCount: existingPosition._count.assignments }
    })
  }

  // Delete position (cascade will handle related records like shifts)
  await prisma.event_positions.delete({
    where: { id: positionId }
  })

  return res.status(200).json({
    success: true,
    message: 'Position deleted successfully'
  })
}
