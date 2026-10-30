import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { computeSessionAttendanceBreakdown } from '@/lib/countSessionReporting'
import { buildCountSubmissionSummaries } from '@/lib/countSessionSubmissionSummaries'
import { z } from 'zod'
import { handleApiError } from '@/lib/apiError'
import { blockSimulatedMutation } from '@/lib/countAssignments'

// Validation schema for updating count session
const updateCountSessionSchema = z.object({
  sessionName: z.string().min(1).max(255).optional(),
  countTime: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid count time').optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  isActive: z.boolean().optional(),
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
        return await handleGet(req, res, eventId, sessionId)
      case 'PUT':
        if (blockSimulatedMutation(req, res)) return
        // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, and KEYMAN can update count sessions
        if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(user.role)) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }
        return await handlePut(req, res, eventId, sessionId)
      case 'DELETE':
        if (blockSimulatedMutation(req, res)) return
        // Only ADMIN can delete count sessions
        if (user.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }
        return await handleDelete(req, res, eventId, sessionId)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, sessionId: string) {
  const countSession = await prisma.count_sessions.findUnique({
    where: { id: sessionId },
    include: {
      position_counts: {
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
      },
      groups: {
        orderBy: { name: 'asc' },
        include: {
          entry: {
            include: {
              enteredByUser: { select: { firstName: true, lastName: true } }
            }
          },
          positions: {
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
          }
        }
      }
    }
  })

  if (!countSession) {
    return res.status(404).json({ error: 'Count session not found' })
  }

  if (countSession.eventId !== eventId) {
    return res.status(400).json({ error: 'Count session does not belong to this event' })
  }

  const breakdown = await computeSessionAttendanceBreakdown(sessionId)

  const countedIds = [
    ...new Set(countSession.position_counts.map((pc) => pc.countedBy).filter((x): x is string => !!x))
  ]
  const [usersRows, volunteerRows] = await Promise.all([
    prisma.users.findMany({
      where: { id: { in: countedIds } },
      select: { id: true, firstName: true, lastName: true }
    }),
    prisma.volunteers.findMany({
      where: { id: { in: countedIds } },
      select: { id: true, firstName: true, lastName: true }
    })
  ])
  const userLabel = new Map(usersRows.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
  const volLabel = new Map(volunteerRows.map((v) => [v.id, `${v.firstName} ${v.lastName}`.trim()]))
  const resolveActorName = (id: string | null | undefined) => {
    if (!id) return null
    return userLabel.get(id) ?? volLabel.get(id) ?? null
  }

  const { groups: sessionGroups, ...sessionRest } = countSession

  const summaries = buildCountSubmissionSummaries(sessionGroups as any, countSession.position_counts as any, resolveActorName)

  return res.status(200).json({
    success: true,
    data: {
      ...sessionRest,
      reportedAttendeeTotal: breakdown.attendeeTotal,
      reportingSlots: breakdown.reportingSlots,
      groupSubmissionSummaries: summaries.groupSubmissionSummaries,
      ungroupedPositionSubmissions: summaries.ungroupedPositionSubmissions
    }
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, sessionId: string) {
  // Validate request body
  const validation = updateCountSessionSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if count session exists and belongs to event
  const existingSession = await prisma.count_sessions.findUnique({
    where: { id: sessionId },
    select: { eventId: true }
  })

  if (!existingSession) {
    return res.status(404).json({ error: 'Count session not found' })
  }

  if (existingSession.eventId !== eventId) {
    return res.status(400).json({ error: 'Count session does not belong to this event' })
  }

  // Build update data
  const updateData: any = {
    updatedAt: new Date()
  }
  
  if (data.sessionName) updateData.sessionName = data.sessionName
  if (data.countTime) updateData.countTime = new Date(data.countTime)
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.status) updateData.status = data.status
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  
  // Update count session
  const updatedSession = await prisma.count_sessions.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      position_counts: {
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
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: updatedSession,
    message: 'Count session updated successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, sessionId: string) {
  // Check if count session exists and belongs to event
  const existingSession = await prisma.count_sessions.findUnique({
    where: { id: sessionId },
    select: { eventId: true }
  })

  if (!existingSession) {
    return res.status(404).json({ error: 'Count session not found' })
  }

  if (existingSession.eventId !== eventId) {
    return res.status(400).json({ error: 'Count session does not belong to this event' })
  }

  // Delete count session (cascade will delete position_counts)
  await prisma.count_sessions.delete({
    where: { id: sessionId }
  })

  return res.status(200).json({
    success: true,
    message: 'Count session deleted successfully'
  })
}
