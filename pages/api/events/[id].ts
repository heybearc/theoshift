import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for event updates
const updateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255).optional(),
  description: z.string().optional(),
  eventType: z.enum(['ASSEMBLY', 'CONVENTION', 'SPECIAL_EVENT', 'MEETING']).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(1, 'Location is required').max(500).optional(),
  venue: z.string().optional(),
  status: z.enum(['ARCHIVED', 'UPCOMING', 'CURRENT', 'COMPLETED', 'CANCELLED']).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
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
        return await handleGet(req, res, id)
      case 'PUT':
        return await handlePut(req, res, id, user.id)
      case 'DELETE':
        return await handleDelete(req, res, id, user.role)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  const event = await prisma.events.findUnique({
    where: { id },
    include: {
      event_attendant_associations: {
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      },
      assignments: {
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
      },
      event_positions: {
        include: {
          position_shifts: true,
          _count: {
            select: {
              assignments: true
            }
          }
        }
      },
      departments: {
        include: {
          station_ranges: true
        }
      },
      _count: {
        select: {
          event_attendant_associations: true,
          assignments: true,
          event_positions: true
        }
      }
    }
  })

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  return res.status(200).json({
    success: true,
    data: event
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string, userId: string) {
  // Check if event exists
  const existingEvent = await prisma.events.findUnique({
    where: { id }
  })

  if (!existingEvent) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Validate request body
  const validation = updateEventSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Additional validation: if both dates are provided, end date must be >= start date
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    
    if (endDate < startDate) {
      return res.status(400).json({
        error: 'End date must be on or after start date'
      })
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date()
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.eventType !== undefined) updateData.eventType = data.eventType
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate + 'T00:00:00')
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate + 'T00:00:00')
  if (data.startTime !== undefined) updateData.startTime = data.startTime
  if (data.endTime !== undefined) updateData.endTime = data.endTime
  if (data.location !== undefined) updateData.location = data.location
  if (data.venue !== undefined) updateData.venue = data.venue
  if (data.status !== undefined) updateData.status = data.status

  // Update event
  const event = await prisma.events.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          event_attendant_associations: true,
          assignments: true,
          event_positions: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: event,
    message: 'Event updated successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string, userRole: string) {
  // Only admins can delete events
  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only administrators can delete events' })
  }

  // Check if event exists
  const existingEvent = await prisma.events.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          assignments: true,
          event_attendant_associations: true
        }
      }
    }
  })

  if (!existingEvent) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Check if event has assignments (prevent deletion if it does)
  if (existingEvent._count.assignments > 0 || existingEvent._count.event_attendant_associations > 0) {
    return res.status(400).json({
      error: 'Cannot delete event with existing assignments. Please remove all assignments first.'
    })
  }

  // Delete event (cascade will handle related records)
  await prisma.events.delete({
    where: { id }
  })

  return res.status(200).json({
    success: true,
    message: 'Event deleted successfully'
  })
}
