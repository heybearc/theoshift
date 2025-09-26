import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for attendant association updates
const updateAttendantAssociationSchema = z.object({
  role: z.string().optional(),
  notes: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, attendantId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (!attendantId || typeof attendantId !== 'string') {
    return res.status(400).json({ error: 'Attendant ID is required' })
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
        return await handleGet(req, res, eventId, attendantId)
      case 'PUT':
        return await handlePut(req, res, eventId, attendantId, user.id)
      case 'DELETE':
        return await handleDelete(req, res, eventId, attendantId, user.role)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event Attendant API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  const association = await prisma.event_attendant_associations.findUnique({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: attendantId
      }
    },
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
      events: {
        select: {
          id: true,
          name: true,
          eventType: true,
          startDate: true,
          endDate: true
        }
      }
    }
  })

  if (!association) {
    return res.status(404).json({ error: 'Attendant association not found' })
  }

  // Get attendant's assignments for this event
  const assignments = await prisma.assignments.findMany({
    where: {
      eventId: eventId,
      userId: attendantId
    },
    include: {
      event_positions: {
        select: {
          id: true,
          positionNumber: true,
          title: true,
          department: true,
          description: true
        }
      }
    },
    orderBy: {
      shiftStart: 'asc'
    }
  })

  return res.status(200).json({
    success: true,
    data: {
      association,
      assignments
    }
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string, userId: string) {
  // Check if association exists
  const existingAssociation = await prisma.event_attendant_associations.findUnique({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: attendantId
      }
    }
  })

  if (!existingAssociation) {
    return res.status(404).json({ error: 'Attendant association not found' })
  }

  // Validate request body
  const validation = updateAttendantAssociationSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date()
  }

  if (data.role !== undefined) updateData.role = data.role
  if (data.notes !== undefined) updateData.notes = data.notes

  // Update association
  const association = await prisma.event_attendant_associations.update({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: attendantId
      }
    },
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
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: association,
    message: 'Attendant association updated successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string, userRole: string) {
  // Check if association exists
  const existingAssociation = await prisma.event_attendant_associations.findUnique({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: attendantId
      }
    }
  })

  if (!existingAssociation) {
    return res.status(404).json({ error: 'Attendant association not found' })
  }

  // Check if attendant has assignments (prevent deletion if they do)
  const assignmentCount = await prisma.assignments.count({
    where: {
      eventId: eventId,
      userId: attendantId
    }
  })

  if (assignmentCount > 0) {
    return res.status(400).json({
      error: 'Cannot remove attendant with existing assignments. Please remove all assignments first.',
      details: { assignmentCount }
    })
  }

  // Delete association
  await prisma.event_attendant_associations.delete({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: attendantId
      }
    }
  })

  return res.status(200).json({
    success: true,
    message: 'Attendant removed from event successfully'
  })
}
