import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for lanyard creation
const lanyardSchema = z.object({
  lanyardNumber: z.string().min(1, 'Lanyard number is required').max(50),
  type: z.enum(['ATTENDANT', 'OVERSEER', 'KEYMAN', 'SECURITY', 'MEDICAL', 'SPECIAL']),
  color: z.string().min(1, 'Color is required').max(50),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

// Validation schema for lanyard assignment
const lanyardAssignmentSchema = z.object({
  lanyardId: z.string().min(1, 'Lanyard ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  assignedAt: z.string().optional(),
  notes: z.string().optional(),
})

// Validation schema for bulk lanyard operations
const bulkLanyardSchema = z.object({
  lanyards: z.array(lanyardSchema)
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
    console.error('Event Lanyards API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const {
    page = '1',
    limit = '20',
    search = '',
    type = '',
    status = '',
    sortBy = 'lanyardNumber',
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
      { lanyardNumber: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { color: { contains: search as string, mode: 'insensitive' } }
    ]
  }
  
  if (type) {
    where.type = type as string
  }

  if (status === 'assigned') {
    where.lanyard_assignments = {
      some: {
        returnedAt: null
      }
    }
  } else if (status === 'available') {
    where.lanyard_assignments = {
      none: {
        returnedAt: null
      }
    }
  }

  // Get lanyards with pagination
  const [lanyards, total] = await Promise.all([
    prisma.lanyards.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc'
      },
      include: {
        lanyard_assignments: {
          where: {
            returnedAt: null // Only active assignments
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
            }
          }
        },
        _count: {
          select: {
            lanyard_assignments: true
          }
        }
      }
    }),
    prisma.lanyards.count({ where })
  ])

  // Get lanyard statistics
  const stats = await prisma.lanyards.groupBy({
    by: ['type'],
    where: { eventId },
    _count: {
      type: true
    }
  })

  // Get assignment statistics
  const assignmentStats = {
    total: await prisma.lanyards.count({ where: { eventId } }),
    assigned: await prisma.lanyards.count({
      where: {
        eventId,
        lanyard_assignments: {
          some: {
            returnedAt: null
          }
        }
      }
    }),
    available: await prisma.lanyards.count({
      where: {
        eventId,
        lanyard_assignments: {
          none: {
            returnedAt: null
          }
        }
      }
    })
  }

  // Get available attendants for assignment
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

  const totalPages = Math.ceil(total / limitNum)

  return res.status(200).json({
    success: true,
    data: {
      lanyards,
      stats,
      assignmentStats,
      availableAttendants,
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
  // Check if this is a bulk operation, assignment, or single lanyard creation
  if (req.body.assign) {
    return await handleLanyardAssignment(req, res, eventId, userId)
  } else if (req.body.lanyards && Array.isArray(req.body.lanyards)) {
    return await handleBulkCreate(req, res, eventId, userId)
  } else {
    return await handleSingleCreate(req, res, eventId, userId)
  }
}

async function handleSingleCreate(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = lanyardSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if lanyard number already exists for this event
  const existingLanyard = await prisma.lanyards.findUnique({
    where: {
      eventId_lanyardNumber: {
        eventId: eventId,
        lanyardNumber: data.lanyardNumber
      }
    }
  })

  if (existingLanyard) {
    return res.status(400).json({ 
      error: `Lanyard number ${data.lanyardNumber} already exists for this event` 
    })
  }

  // Create lanyard
  const lanyard = await prisma.lanyards.create({
    data: {
      eventId: eventId,
      lanyardNumber: data.lanyardNumber,
      type: data.type,
      color: data.color,
      description: data.description,
      isActive: data.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      _count: {
        select: {
          lanyard_assignments: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: lanyard,
    message: 'Lanyard created successfully'
  })
}

async function handleBulkCreate(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = bulkLanyardSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const { lanyards } = validation.data

  // Check for duplicate lanyard numbers within the request
  const lanyardNumbers = lanyards.map(l => l.lanyardNumber)
  const duplicateNumbers = lanyardNumbers.filter((num, index) => lanyardNumbers.indexOf(num) !== index)
  
  if (duplicateNumbers.length > 0) {
    return res.status(400).json({
      error: 'Duplicate lanyard numbers in request',
      details: { duplicateNumbers }
    })
  }

  // Check for existing lanyard numbers in database
  const existingLanyards = await prisma.lanyards.findMany({
    where: {
      eventId: eventId,
      lanyardNumber: { in: lanyardNumbers }
    },
    select: { lanyardNumber: true }
  })

  const existingNumbers = existingLanyards.map(l => l.lanyardNumber)
  const newLanyards = lanyards.filter(l => !existingNumbers.includes(l.lanyardNumber))

  if (newLanyards.length === 0) {
    return res.status(400).json({
      error: 'All lanyard numbers already exist for this event'
    })
  }

  // Create bulk lanyards
  const createdLanyards = await prisma.lanyards.createMany({
    data: newLanyards.map(lanyard => ({
      eventId: eventId,
      lanyardNumber: lanyard.lanyardNumber,
      type: lanyard.type,
      color: lanyard.color,
      description: lanyard.description,
      isActive: lanyard.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  })

  return res.status(201).json({
    success: true,
    data: {
      created: createdLanyards.count,
      skipped: existingNumbers.length,
      total: lanyards.length
    },
    message: `Successfully created ${createdLanyards.count} lanyards`
  })
}

async function handleLanyardAssignment(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate assignment request
  const validation = lanyardAssignmentSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Verify lanyard exists and belongs to this event
  const lanyard = await prisma.lanyards.findUnique({
    where: { id: data.lanyardId }
  })

  if (!lanyard || lanyard.eventId !== eventId) {
    return res.status(404).json({ error: 'Lanyard not found' })
  }

  // Check if lanyard is already assigned
  const existingAssignment = await prisma.lanyard_assignments.findFirst({
    where: {
      lanyardId: data.lanyardId,
      returnedAt: null
    }
  })

  if (existingAssignment) {
    return res.status(400).json({ error: 'Lanyard is already assigned' })
  }

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
      error: 'User is not associated with this event' 
    })
  }

  // Create assignment
  const assignment = await prisma.lanyard_assignments.create({
    data: {
      lanyardId: data.lanyardId,
      userId: data.userId,
      assignedAt: data.assignedAt ? new Date(data.assignedAt) : new Date(),
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
      lanyards: {
        select: {
          id: true,
          lanyardNumber: true,
          type: true,
          color: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: assignment,
    message: 'Lanyard assigned successfully'
  })
}
