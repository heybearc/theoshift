import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { handleApiError } from '@/lib/apiError'
import {
  blockSimulatedMutation,
  canReviseSubmittedCount,
  getSessionUser,
  resolveUserIdForCountEnteredBy,
  resolveVolunteerIdForSessionUser
} from '@/lib/countAssignments'
import { volunteerCanEnterStationCount } from '@/lib/countStationVolunteerAccess'

// Validation schema for position count
const positionCountSchema = z.object({
  positionId: z.string().uuid('Invalid position ID').optional(),
  groupId: z.string().uuid('Invalid group ID').optional(),
  attendeeCount: z.number().int().min(0).optional(),
  notes: z.string().optional(),
}).refine((input) => !!input.positionId || !!input.groupId, {
  message: 'Either positionId or groupId is required'
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, sessionId } = req.query

  if (!eventId || typeof eventId !== 'string' || !sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Event ID and Session ID are required' })
  }

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId, sessionId)
      case 'POST':
        if (blockSimulatedMutation(req, res)) return
        return await handlePost(req, res, eventId, sessionId, sessionUser.id, sessionUser.role)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // Error logged by handleApiError
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

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  eventId: string,
  sessionId: string,
  userId: string,
  role: string
) {
  // Validate request body
  const validation = positionCountSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // New grouped flow: one count entry per station group (primary/secondary can submit).
  if (data.groupId) {
    const group = await prisma.count_session_groups.findUnique({
      where: { id: data.groupId },
      include: {
        countSession: { select: { id: true, eventId: true, status: true } },
        positions: { select: { positionId: true } }
      }
    })

    if (!group || group.countSessionId !== sessionId || group.countSession.eventId !== eventId) {
      return res.status(404).json({ error: 'Count group not found for this session/event' })
    }

    if (group.countSession.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Count session is not active' })
    }

    const reviser = await canReviseSubmittedCount(userId, role, eventId)
    if (!reviser) {
      const volunteerId = await resolveVolunteerIdForSessionUser(userId, role)
      if (!volunteerId) {
        return res.status(403).json({ error: 'No volunteer identity found for this user' })
      }
      const canEnter = volunteerId === group.primaryVolunteerId || volunteerId === group.secondaryVolunteerId
      if (!canEnter) {
        return res.status(403).json({ error: 'Only assigned primary/secondary counters can submit this group count' })
      }
    }

    const existingEntry = await prisma.count_group_entries.findUnique({
      where: { groupId: data.groupId },
      select: { id: true }
    })
    if (existingEntry && !reviser) {
      return res.status(403).json({
        error: 'A submitted count can only be changed by an overseer or event staff'
      })
    }

    const enteredByUserId = await resolveUserIdForCountEnteredBy(userId, role)
    const enteredByVolunteerId = await resolveVolunteerIdForSessionUser(userId, role)

    const entry = await prisma.count_group_entries.upsert({
      where: { groupId: data.groupId },
      create: {
        groupId: data.groupId,
        attendeeCount: data.attendeeCount ?? null,
        notes: data.notes,
        enteredBy: enteredByUserId,
        enteredByVolunteerId,
        enteredAt: new Date()
      },
      update: {
        attendeeCount: data.attendeeCount ?? null,
        notes: data.notes,
        enteredBy: enteredByUserId,
        enteredByVolunteerId,
        enteredAt: new Date(),
        updatedAt: new Date()
      }
    })

    return res.status(200).json({
      success: true,
      data: entry,
      message: 'Group count submitted successfully'
    })
  }

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

  if (!data.positionId) {
    return res.status(400).json({ error: 'Position ID is required' })
  }
  const positionId = data.positionId

  // Verify position exists and belongs to event
  const position = await prisma.positions.findUnique({
    where: { id: positionId },
    select: { eventId: true }
  })

  if (!position) {
    return res.status(404).json({ error: 'Position not found' })
  }

  if (position.eventId !== eventId) {
    return res.status(400).json({ error: 'Position does not belong to this event' })
  }

  const reviser = await canReviseSubmittedCount(userId, role, eventId)
  if (!reviser) {
    const volunteerId = await resolveVolunteerIdForSessionUser(userId, role)
    if (!volunteerId) {
      return res.status(403).json({ error: 'No volunteer identity found for this user' })
    }

    const canEnter = await volunteerCanEnterStationCount({
      eventId,
      countSessionId: sessionId,
      positionId,
      volunteerId,
    })

    if (!canEnter) {
      return res.status(403).json({ error: 'You are not assigned to enter a count for this station/session' })
    }
  }

  // Check if count already exists for this position in this session
  const existingCount = await prisma.position_counts.findUnique({
    where: {
      countSessionId_positionId: {
        countSessionId: sessionId,
        positionId
      }
    }
  })

  let positionCount

  if (existingCount && !reviser) {
    return res.status(403).json({
      error: 'A submitted count can only be changed by an overseer or event staff'
    })
  }

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
        positionId,
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
