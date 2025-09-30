import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for count session creation
const createCountSessionSchema = z.object({
  sessionName: z.string().min(1, 'Session name is required').max(255),
  countTime: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid count time'),
  notes: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Get user details
  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { id: true, role: true }
  })

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId)
      case 'POST':
        // Only ADMIN and OVERSEER can create count sessions
        if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }
        return await handlePost(req, res, eventId, user.id)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Count sessions API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  // Verify event exists and user has access
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { id: true }
  })

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Fetch count sessions for this event
  const countSessions = await prisma.count_sessions.findMany({
    where: { eventId },
    include: {
      position_counts: {
        include: {
          event_positions: {
            select: {
              id: true,
              positionNumber: true,
              positionName: true,
              department: true
            }
          }
        }
      }
    },
    orderBy: { countTime: 'desc' }
  })

  return res.status(200).json({
    success: true,
    data: countSessions
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Verify event exists
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { id: true }
  })

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Validate request body
  const validation = createCountSessionSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if session name already exists for this event
  const existingSession = await prisma.count_sessions.findFirst({
    where: {
      eventId,
      sessionName: data.sessionName
    }
  })

  if (existingSession) {
    return res.status(400).json({
      error: 'A count session with this name already exists for this event'
    })
  }

  // Create count session
  const countSession = await prisma.count_sessions.create({
    data: {
      id: crypto.randomUUID(),
      eventId,
      sessionName: data.sessionName,
      countTime: new Date(data.countTime),
      notes: data.notes,
      createdBy: userId,
      updatedAt: new Date()
    },
    include: {
      position_counts: {
        include: {
          event_positions: {
            select: {
              id: true,
              positionNumber: true,
              positionName: true,
              department: true
            }
          }
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: countSession,
    message: 'Count session created successfully'
  })
}
