import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for assignment creation
const assignmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  positionId: z.string().min(1, 'Position ID is required'),
  shiftStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format'),
  shiftEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format'),
  status: z.enum(['ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'NO_SHOW']).default('ASSIGNED'),
  notes: z.string().optional(),
})

// Validation schema for bulk assignment creation
const bulkAssignmentSchema = z.object({
  assignments: z.array(assignmentSchema)
})

// Validation schema for auto-assignment
const autoAssignmentSchema = z.object({
  optimizeFor: z.enum(['workload', 'experience', 'availability']).default('workload'),
  maxAssignmentsPerPerson: z.number().int().positive().optional(),
  preferredSkillMatch: z.boolean().default(true),
  allowOverlappingShifts: z.boolean().default(false)
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

  // Check if user has admin or overseer role
  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { id: true, role: true }
  })

  if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  // Verify event exists
  const event = await prisma.events.findUnique({
    where: { id: eventId }
  })

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId)
      case 'POST':
        return await handlePost(req, res, eventId, user.id)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event Assignments API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const {
    page = '1',
    limit = '20',
    search = '',
    status = '',
    positionId = '',
    attendant = '',
    sortBy = 'shiftStart',
    sortOrder = 'asc'
  } = req.query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  // Build where clause for filtering
  const where: any = {
    eventId: eventId
  }
  
  if (search) {
    where.OR = [
      { 
        users: {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        }
      },
      {
        event_positions: {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { department: { contains: search as string, mode: 'insensitive' } }
          ]
        }
      }
    ]
  }
  
  if (status) {
    where.status = status as string
  }

  if (positionId) {
    where.positionId = positionId as string
  }

  if (attendant) {
    where.userId = attendant as string
  }

  // Get assignments with pagination
  const [assignments, total] = await Promise.all([
    prisma.assignments.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc'
      },
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
            title: true,
            department: true,
            description: true
          }
        },
        events: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.assignments.count({ where })
  ])

  // Get available attendants for this event
  const availableAttendants = await prisma.event_attendant_associations.findMany({
    where: { eventId },
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
    orderBy: [
      { users: { lastName: 'asc' } },
      { users: { firstName: 'asc' } }
    ]
  })

  // Get available positions for this event
  const availablePositions = await prisma.event_positions.findMany({
    where: { 
      eventId,
      isActive: true
    },
    include: {
      _count: {
        select: {
          assignments: true
        }
      }
    },
    orderBy: {
      positionNumber: 'asc'
    }
  })

  // Get assignment statistics
  const stats = await prisma.assignments.groupBy({
    by: ['status'],
    where: { eventId },
    _count: {
      status: true
    }
  })

  const totalPages = Math.ceil(total / limitNum)

  return res.status(200).json({
    success: true,
    data: {
      assignments,
      availableAttendants,
      availablePositions,
      stats,
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

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Check if this is auto-assignment, bulk assignment, or single assignment
  if (req.body.autoAssign) {
    return await handleAutoAssignment(req, res, eventId, userId)
  } else if (req.body.assignments && Array.isArray(req.body.assignments)) {
    return await handleBulkAssignment(req, res, eventId, userId)
  } else {
    return await handleSingleAssignment(req, res, eventId, userId)
  }
}

async function handleSingleAssignment(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = assignmentSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Verify user is associated with this event
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
      error: 'User is not associated with this event. Please add them as an attendant first.' 
    })
  }

  // Verify position exists and is active
  const position = await prisma.event_positions.findUnique({
    where: { id: data.positionId }
  })

  if (!position || position.eventId !== eventId || !position.isActive) {
    return res.status(400).json({ error: 'Invalid or inactive position' })
  }

  // Check for conflicting assignments (same user, overlapping times)
  const conflictingAssignments = await prisma.assignments.findMany({
    where: {
      eventId: eventId,
      userId: data.userId,
      OR: [
        {
          AND: [
            { shiftStart: { lte: data.shiftStart } },
            { shiftEnd: { gt: data.shiftStart } }
          ]
        },
        {
          AND: [
            { shiftStart: { lt: data.shiftEnd } },
            { shiftEnd: { gte: data.shiftEnd } }
          ]
        },
        {
          AND: [
            { shiftStart: { gte: data.shiftStart } },
            { shiftEnd: { lte: data.shiftEnd } }
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

  // Create assignment
  const assignment = await prisma.assignments.create({
    data: {
      eventId: eventId,
      userId: data.userId,
      positionId: data.positionId,
      shiftStart: data.shiftStart,
      shiftEnd: data.shiftEnd,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    },
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
          title: true,
          department: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: assignment,
    message: 'Assignment created successfully'
  })
}

async function handleBulkAssignment(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = bulkAssignmentSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const { assignments } = validation.data

  // Validate all users are associated with the event
  const userIds = [...new Set(assignments.map(a => a.userId))]
  const attendantAssociations = await prisma.event_attendant_associations.findMany({
    where: {
      eventId: eventId,
      userId: { in: userIds }
    }
  })

  const associatedUserIds = attendantAssociations.map(a => a.userId)
  const missingUserIds = userIds.filter(id => !associatedUserIds.includes(id))

  if (missingUserIds.length > 0) {
    return res.status(400).json({
      error: 'Some users are not associated with this event',
      details: { missingUserIds }
    })
  }

  // Validate all positions exist and are active
  const positionIds = [...new Set(assignments.map(a => a.positionId))]
  const positions = await prisma.event_positions.findMany({
    where: {
      id: { in: positionIds },
      eventId: eventId,
      isActive: true
    }
  })

  const validPositionIds = positions.map(p => p.id)
  const invalidPositionIds = positionIds.filter(id => !validPositionIds.includes(id))

  if (invalidPositionIds.length > 0) {
    return res.status(400).json({
      error: 'Some positions are invalid or inactive',
      details: { invalidPositionIds }
    })
  }

  // Create assignments in transaction
  const createdAssignments = await prisma.$transaction(
    assignments.map(assignment => 
      prisma.assignments.create({
        data: {
          eventId: eventId,
          userId: assignment.userId,
          positionId: assignment.positionId,
          shiftStart: assignment.shiftStart,
          shiftEnd: assignment.shiftEnd,
          status: assignment.status,
          notes: assignment.notes,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    )
  )

  return res.status(201).json({
    success: true,
    data: {
      created: createdAssignments.length,
      assignments: createdAssignments
    },
    message: `Successfully created ${createdAssignments.length} assignments`
  })
}

async function handleAutoAssignment(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate auto-assignment parameters
  const validation = autoAssignmentSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const params = validation.data

  // Get event details
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    include: {
      event_attendant_associations: {
        include: {
          users: true
        }
      },
      event_positions: {
        where: { isActive: true },
        include: {
          assignments: true
        }
      }
    }
  })

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Auto-assignment algorithm
  const autoAssignmentResult = await performAutoAssignment(event, params)

  if (autoAssignmentResult.success) {
    return res.status(200).json({
      success: true,
      data: autoAssignmentResult.data,
      message: `Auto-assignment completed: ${autoAssignmentResult.data.assignmentsCreated} assignments created`
    })
  } else {
    return res.status(400).json({
      error: 'Auto-assignment failed',
      details: autoAssignmentResult.error
    })
  }
}

// Auto-assignment algorithm (simplified version - can be enhanced)
async function performAutoAssignment(event: any, params: any) {
  try {
    const attendants = event.event_attendant_associations.map((assoc: any) => assoc.users)
    const positions = event.event_positions.filter((pos: any) => pos.assignments.length === 0) // Only unassigned positions
    
    if (positions.length === 0) {
      return {
        success: false,
        error: 'No unassigned positions available'
      }
    }

    const assignments = []
    const attendantWorkload = new Map()

    // Initialize workload tracking
    attendants.forEach((attendant: any) => {
      attendantWorkload.set(attendant.id, 0)
    })

    // Simple assignment algorithm based on workload balancing
    for (const position of positions) {
      // Find attendant with lowest workload
      let selectedAttendant = null
      let minWorkload = Infinity

      for (const attendant of attendants) {
        const currentWorkload = attendantWorkload.get(attendant.id) || 0
        
        // Check if attendant meets basic criteria
        if (params.maxAssignmentsPerPerson && currentWorkload >= params.maxAssignmentsPerPerson) {
          continue
        }

        // Prefer attendants with relevant experience (simplified)
        let score = currentWorkload
        if (params.optimizeFor === 'experience' && attendant.role === 'KEYMAN') {
          score -= 1 // Prefer keymen for leadership positions
        }

        if (score < minWorkload) {
          minWorkload = score
          selectedAttendant = attendant
        }
      }

      if (selectedAttendant) {
        // Create assignment with default shift times
        const assignment = {
          userId: selectedAttendant.id,
          positionId: position.id,
          shiftStart: event.startTime || '09:00',
          shiftEnd: event.endTime || '17:00',
          status: 'ASSIGNED',
          notes: 'Auto-assigned by system'
        }

        assignments.push(assignment)
        attendantWorkload.set(selectedAttendant.id, (attendantWorkload.get(selectedAttendant.id) || 0) + 1)
      }
    }

    // Create assignments in database
    if (assignments.length > 0) {
      const createdAssignments = await prisma.$transaction(
        assignments.map(assignment => 
          prisma.assignments.create({
            data: {
              eventId: event.id,
              userId: assignment.userId,
              positionId: assignment.positionId,
              shiftStart: assignment.shiftStart,
              shiftEnd: assignment.shiftEnd,
              status: assignment.status,
              notes: assignment.notes,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        )
      )

      return {
        success: true,
        data: {
          assignmentsCreated: createdAssignments.length,
          assignments: createdAssignments,
          workloadDistribution: Object.fromEntries(attendantWorkload)
        }
      }
    } else {
      return {
        success: false,
        error: 'No suitable assignments could be made'
      }
    }
  } catch (error) {
    console.error('Auto-assignment error:', error)
    return {
      success: false,
      error: 'Auto-assignment algorithm failed'
    }
  }
}
