import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for position creation
const positionSchema = z.object({
  positionNumber: z.number().int().positive('Position number must be positive'),
  title: z.string().min(1, 'Position title is required').max(255),
  department: z.string().min(1, 'Department is required').max(100),
  description: z.string().optional(),
  requirements: z.string().optional(),
  skillsRequired: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
})

// Validation schema for bulk position creation
const bulkPositionSchema = z.object({
  positions: z.array(positionSchema)
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
    console.error('Event Positions API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const {
    page = '1',
    limit = '20',
    search = '',
    department = '',
    sortBy = 'positionNumber',
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
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { department: { contains: search as string, mode: 'insensitive' } }
    ]
  }
  
  if (department) {
    where.department = { contains: department as string, mode: 'insensitive' }
  }

  // Get positions with pagination
  const [positions, total] = await Promise.all([
    prisma.event_positions.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc'
      },
      include: {
        position_shifts: {
          orderBy: {
            shiftStart: 'asc'
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
            }
          }
        },
        _count: {
          select: {
            assignments: true,
            position_shifts: true
          }
        }
      }
    }),
    prisma.event_positions.count({ where })
  ])

  // Get department summary
  const departments = await prisma.event_positions.groupBy({
    by: ['department'],
    where: { eventId },
    _count: {
      department: true
    },
    orderBy: {
      department: 'asc'
    }
  })

  const totalPages = Math.ceil(total / limitNum)

  return res.status(200).json({
    success: true,
    data: {
      positions,
      departments,
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
  // Check if this is a bulk import or single position
  if (req.body.positions && Array.isArray(req.body.positions)) {
    return await handleBulkCreate(req, res, eventId, userId)
  } else {
    return await handleSingleCreate(req, res, eventId, userId)
  }
}

async function handleSingleCreate(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = positionSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if position number already exists for this event
  const existingPosition = await prisma.event_positions.findUnique({
    where: {
      eventId_positionNumber: {
        eventId: eventId,
        positionNumber: data.positionNumber
      }
    }
  })

  if (existingPosition) {
    return res.status(400).json({ 
      error: `Position number ${data.positionNumber} already exists for this event` 
    })
  }

  // Create position
  const position = await prisma.event_positions.create({
    data: {
      eventId: eventId,
      positionNumber: data.positionNumber,
      title: data.title,
      department: data.department,
      description: data.description,
      requirements: data.requirements,
      skillsRequired: data.skillsRequired || [],
      isActive: data.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      position_shifts: true,
      _count: {
        select: {
          assignments: true,
          position_shifts: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: position,
    message: 'Position created successfully'
  })
}

async function handleBulkCreate(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = bulkPositionSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const { positions } = validation.data

  // Check for duplicate position numbers within the request
  const positionNumbers = positions.map(p => p.positionNumber)
  const duplicateNumbers = positionNumbers.filter((num, index) => positionNumbers.indexOf(num) !== index)
  
  if (duplicateNumbers.length > 0) {
    return res.status(400).json({
      error: 'Duplicate position numbers in request',
      details: { duplicateNumbers }
    })
  }

  // Check for existing position numbers in database
  const existingPositions = await prisma.event_positions.findMany({
    where: {
      eventId: eventId,
      positionNumber: { in: positionNumbers }
    },
    select: { positionNumber: true }
  })

  const existingNumbers = existingPositions.map(p => p.positionNumber)
  const newPositions = positions.filter(p => !existingNumbers.includes(p.positionNumber))

  if (newPositions.length === 0) {
    return res.status(400).json({
      error: 'All position numbers already exist for this event'
    })
  }

  // Create bulk positions
  const createdPositions = await prisma.event_positions.createMany({
    data: newPositions.map(position => ({
      eventId: eventId,
      positionNumber: position.positionNumber,
      title: position.title,
      department: position.department,
      description: position.description,
      requirements: position.requirements,
      skillsRequired: position.skillsRequired || [],
      isActive: position.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  })

  return res.status(201).json({
    success: true,
    data: {
      created: createdPositions.count,
      skipped: existingNumbers.length,
      total: positions.length
    },
    message: `Successfully created ${createdPositions.count} positions`
  })
}
