import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for event creation/update
const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255),
  description: z.string().optional(),
  eventType: z.enum(['ASSEMBLY', 'CONVENTION', 'CIRCUIT_OVERSEER_VISIT', 'SPECIAL_EVENT', 'MEETING', 'MEMORIAL', 'OTHER']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format').optional(),
  location: z.string().min(1, 'Location is required').max(500),
  capacity: z.number().int().positive().optional(),
  attendantsNeeded: z.number().int().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).default('DRAFT'),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res, user.id)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Events API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const {
    page = '1',
    limit = '10',
    search = '',
    eventType = '',
    status = '',
    sortBy = 'startDate',
    sortOrder = 'desc'
  } = req.query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  // Build where clause for filtering
  const where: any = {}
  
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { location: { contains: search as string, mode: 'insensitive' } }
    ]
  }
  
  if (eventType) {
    where.eventType = eventType as string
  }
  
  if (status) {
    where.status = status as string
  }

  // Get events with pagination
  const [events, total] = await Promise.all([
    prisma.events.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc'
      },
      include: {
        _count: {
          select: {
            event_attendant_associations: true,
            assignments: true,
            event_positions: true
          }
        }
      }
    }),
    prisma.events.count({ where })
  ])

  const totalPages = Math.ceil(total / limitNum)

  return res.status(200).json({
    success: true,
    data: {
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    }
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // Validate request body
  const validation = eventSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Additional validation: end date must be >= start date
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  
  if (endDate < startDate) {
    return res.status(400).json({
      error: 'End date must be on or after start date'
    })
  }

  // Create event
  const event = await prisma.events.create({
    data: {
      name: data.name,
      description: data.description,
      eventType: data.eventType,
      startDate: startDate,
      endDate: endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      capacity: data.capacity,
      attendantsNeeded: data.attendantsNeeded,
      status: data.status,
      createdBy: userId,
      updatedAt: new Date()
    },
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

  return res.status(201).json({
    success: true,
    data: event,
    message: 'Event created successfully'
  })
}
