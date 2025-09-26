import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for attendant association
const attendantAssociationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.string().optional(),
  notes: z.string().optional(),
})

// Validation schema for bulk attendant import
const bulkAttendantSchema = z.object({
  attendants: z.array(z.object({
    userId: z.string().min(1, 'User ID is required'),
    role: z.string().optional(),
    notes: z.string().optional(),
  }))
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
    console.error('Event Attendants API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const {
    page = '1',
    limit = '20',
    search = '',
    role = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  // Build where clause for filtering
  const where: any = {
    eventId: eventId
  }
  
  if (search) {
    where.users = {
      OR: [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ]
    }
  }
  
  if (role) {
    where.role = role as string
  }

  // Get event attendant associations with pagination
  const [associations, total] = await Promise.all([
    prisma.event_attendant_associations.findMany({
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
            role: true,
            createdAt: true
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
    prisma.event_attendant_associations.count({ where })
  ])

  // Get available users not yet associated with this event
  const availableUsers = await prisma.users.findMany({
    where: {
      AND: [
        {
          NOT: {
            event_attendant_associations: {
              some: {
                eventId: eventId
              }
            }
          }
        },
        {
          role: {
            in: ['ATTENDANT', 'KEYMAN', 'ASSISTANT_OVERSEER', 'OVERSEER']
          }
        }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ]
  })

  const totalPages = Math.ceil(total / limitNum)

  return res.status(200).json({
    success: true,
    data: {
      associations,
      availableUsers,
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
  // Check if this is a bulk import or single association
  if (req.body.attendants && Array.isArray(req.body.attendants)) {
    return await handleBulkImport(req, res, eventId, userId)
  } else {
    return await handleSingleAssociation(req, res, eventId, userId)
  }
}

async function handleSingleAssociation(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = attendantAssociationSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if user exists
  const targetUser = await prisma.users.findUnique({
    where: { id: data.userId }
  })

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Check if association already exists
  const existingAssociation = await prisma.event_attendant_associations.findUnique({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: data.userId
      }
    }
  })

  if (existingAssociation) {
    return res.status(400).json({ error: 'User is already associated with this event' })
  }

  // Create association
  const association = await prisma.event_attendant_associations.create({
    data: {
      eventId: eventId,
      userId: data.userId,
      role: data.role,
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
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: association,
    message: 'Attendant associated with event successfully'
  })
}

async function handleBulkImport(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  // Validate request body
  const validation = bulkAttendantSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const { attendants } = validation.data

  // Validate all user IDs exist
  const userIds = attendants.map(a => a.userId)
  const existingUsers = await prisma.users.findMany({
    where: {
      id: { in: userIds }
    },
    select: { id: true }
  })

  const existingUserIds = existingUsers.map(u => u.id)
  const missingUserIds = userIds.filter(id => !existingUserIds.includes(id))

  if (missingUserIds.length > 0) {
    return res.status(400).json({
      error: 'Some users not found',
      details: { missingUserIds }
    })
  }

  // Check for existing associations
  const existingAssociations = await prisma.event_attendant_associations.findMany({
    where: {
      eventId: eventId,
      userId: { in: userIds }
    },
    select: { userId: true }
  })

  const existingAssociationUserIds = existingAssociations.map(a => a.userId)
  const newAttendants = attendants.filter(a => !existingAssociationUserIds.includes(a.userId))

  if (newAttendants.length === 0) {
    return res.status(400).json({
      error: 'All users are already associated with this event'
    })
  }

  // Create bulk associations
  const associations = await prisma.event_attendant_associations.createMany({
    data: newAttendants.map(attendant => ({
      eventId: eventId,
      userId: attendant.userId,
      role: attendant.role,
      notes: attendant.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  })

  return res.status(201).json({
    success: true,
    data: {
      created: associations.count,
      skipped: existingAssociationUserIds.length,
      total: attendants.length
    },
    message: `Successfully associated ${associations.count} attendants with event`
  })
}
