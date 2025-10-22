import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for position count
const positionCountSchema = z.object({
  positionId: z.string().uuid('Invalid position ID'),
  attendeeCount: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, sessionId } = req.query

  if (!eventId || typeof eventId !== 'string' || !sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Event ID and Session ID are required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Get user ID - handle both regular users and attendants
  let userId = session.user.id
  
  // If no user ID in session, try to look up by email
  if (!userId && session.user.email) {
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })
    
    if (user) {
      userId = user.id
    } else {
      // Try to find attendant by email
      const attendant = await prisma.attendants.findFirst({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (attendant) {
        userId = attendant.id
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'User not found' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId, sessionId)
      case 'POST':
        return await handlePost(req, res, eventId, sessionId, userId)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Position counts API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, sessionId: string) {
  // Fetch all counts for this session
  const counts = await prisma.position_counts.findMany({
    where: {
      countSessionId: sessionId
    },
    include: {
      position: {
        select: {
          id: true,
          positionNumber: true,
          name: true,
          area: true
        }
      }
    },
    orderBy: {
      position: {
        positionNumber: 'asc'
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: counts
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string, sessionId: string, userId: string) {
  // Validate request body
  const validation = positionCountSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Verify count session exists and belongs to event
  const countSession = await prisma.count_sessions.findUnique({
    where: { id: sessionId },
    select: { eventId: true, status: true }
  })

  if (!countSession) {
    return res.status(404).json({ error: 'Count session not found' })
  }

  if (countSession.eventId !== eventId) {
    return res.status(400).json({ error: 'Count session does not belong to this event' })
  }

  if (countSession.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Count session is not active' })
  }

  // Verify position exists and belongs to event
  const position = await prisma.positions.findUnique({
    where: { id: data.positionId },
    select: { eventId: true }
  })

  if (!position) {
    return res.status(404).json({ error: 'Position not found' })
  }

  if (position.eventId !== eventId) {
    return res.status(400).json({ error: 'Position does not belong to this event' })
  }

  // Check if count already exists for this position in this session
  const existingCount = await prisma.position_counts.findUnique({
    where: {
      countSessionId_positionId: {
        countSessionId: sessionId,
        positionId: data.positionId
      }
    }
  })

  let positionCount

  if (existingCount) {
    // Update existing count
    positionCount = await prisma.position_counts.update({
      where: { id: existingCount.id },
      data: {
        attendeeCount: data.attendeeCount ?? null,
        notes: data.notes,
        countedBy: userId,
        countedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        position: {
          select: {
            id: true,
            positionNumber: true,
            name: true,
            area: true
          }
        }
      }
    })
  } else {
    // Create new count
    positionCount = await prisma.position_counts.create({
      data: {
        id: crypto.randomUUID(),
        countSessionId: sessionId,
        positionId: data.positionId,
        attendeeCount: data.attendeeCount ?? null,
        notes: data.notes,
        countedBy: userId,
        countedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        position: {
          select: {
            id: true,
            positionNumber: true,
            name: true,
            area: true
          }
        }
      }
    })
  }

  return res.status(existingCount ? 200 : 201).json({
    success: true,
    data: positionCount,
    message: existingCount ? 'Count updated successfully' : 'Count submitted successfully'
  })
}
