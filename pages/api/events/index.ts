import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for event creation/update
const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255),
  description: z.string().optional(),
  eventType: z.enum(['ASSEMBLY', 'CONVENTION', 'SPECIAL_EVENT', 'MEETING']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format').optional(),
  location: z.string().min(1, 'Location is required').max(500),
  // Note: capacity and attendantsNeeded are validated but not stored in DB (could use settings field)
  capacity: z.number().int().positive().optional(),
  attendantsNeeded: z.number().int().min(0).optional(),
  status: z.enum(['ARCHIVED', 'UPCOMING', 'CURRENT', 'COMPLETED', 'CANCELLED']).default('UPCOMING'),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Get user information
  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { id: true, role: true }
  })

  if (!user) {
    return res.status(403).json({ error: 'User not found' })
  }

  // Allow all authenticated users to view events
  // Only ADMIN and OVERSEER can create events (handled in POST method)

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        // Only ADMIN and OVERSEER can create events
        if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
          return res.status(403).json({ error: 'Insufficient permissions to create events' })
        }
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

  // Check if we should include current event detection
  const includeStats = req.query.includeStats === 'true'
  let currentEvent: typeof events[0] | undefined = undefined
  
  if (includeStats) {
    // Find current event (event that's happening now)
    const now = new Date()
    currentEvent = events.find(event => {
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      return now >= start && now <= end
    })
  }

  return res.status(200).json({
    success: true,
    data: {
      events: events.map(event => ({
        ...event,
        status: getEventStatus(event.startDate, event.endDate),
        attendantsCount: event._count.event_attendant_associations,
        positionsCount: event._count.event_positions
      })),
      currentEvent: currentEvent ? {
        ...currentEvent,
        status: getEventStatus(currentEvent.startDate, currentEvent.endDate),
        attendantsCount: currentEvent._count.event_attendant_associations,
        positionsCount: currentEvent._count.event_positions
      } : null,
      pagination: {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
        total: total,
        pages: Math.ceil(total / limitNum),
        hasNext: skip + limitNum < total,
        hasPrev: skip > 0
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
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      eventType: data.eventType as any,
      startDate: startDate,
      endDate: endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      capacity: data.capacity,
      attendantsNeeded: data.attendantsNeeded,
      countTimesEnabled: false, // Default to false, can be enabled later
      status: data.status as any,
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

function getEventStatus(startDate: Date, endDate: Date): 'upcoming' | 'current' | 'past' {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (now < start) {
    return 'upcoming'
  } else if (now >= start && now <= end) {
    return 'current'
  } else {
    return 'past'
  }
}
