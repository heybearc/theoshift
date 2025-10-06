import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { FormOfService, FORMS_OF_SERVICE } from '../../../../../src/types/attendant'

// APEX GUARDIAN Event-Specific Attendants API
// Industry best practice: Event-scoped data management

// Validation schemas
const eventAttendantCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  congregation: z.string().min(1, 'Congregation is required'),
  formsOfService: z.array(z.enum(['Elder', 'Ministerial Servant', 'Exemplary', 'Regular Pioneer', 'Other Department'])),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  userId: z.string().optional()
})

const eventAttendantUpdateSchema = eventAttendantCreateSchema.partial()

const bulkImportSchema = z.object({
  attendants: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    congregation: z.string().min(1),
    formsOfService: z.string(), // Comma-separated string
    isActive: z.boolean().default(true),
    notes: z.string().optional()
  }))
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    // Permission check
    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    // Extract eventId from URL
    const { id: eventId } = req.query
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId },
      select: { id: true, name: true }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetEventAttendants(req, res, eventId)
      case 'POST':
        return await handleCreateEventAttendant(req, res, eventId)
      case 'PUT':
        return await handleBulkImportEventAttendants(req, res, eventId)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event attendants API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetEventAttendants(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { 
    page = '1', 
    limit = '10', 
    search = '', 
    congregation = '',
    formsOfService = '',
    isActive = '',
    includeStats = 'false'
  } = req.query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  // Build where clause for event-specific filtering
  const where: any = {
    eventId: eventId // Always filter by event
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { congregation: { contains: search as string, mode: 'insensitive' } }
    ]
  }

  if (congregation) {
    where.congregation = { contains: congregation as string, mode: 'insensitive' }
  }

  if (formsOfService) {
    const forms = (formsOfService as string).split(',').filter(Boolean)
    if (forms.length > 0) {
      where.formsOfService = {
        path: '$[*]',
        array_contains: forms
      }
    }
  }

  if (isActive !== '') {
    where.isActive = isActive === 'true'
  }

  try {
    const [attendants, total] = await Promise.all([
      prisma.event_attendants.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ],
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true
            }
          }
        }
      }),
      prisma.event_attendants.count({ where })
    ])

    let stats: any = undefined
    if (includeStats === 'true') {
      stats = await generateEventAttendantStats(eventId)
    }

    return res.status(200).json({
      success: true,
      data: {
        attendants,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        stats,
        eventId,
        eventName: (await prisma.events.findUnique({ 
          where: { id: eventId }, 
          select: { name: true } 
        }))?.name
      }
    })
  } catch (error) {
    console.error('Get event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch attendants' })
  }
}

async function handleCreateEventAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  try {
    const validatedData = eventAttendantCreateSchema.parse(req.body)

    // Check if attendant with email already exists in this event
    const existingAttendant = await prisma.event_attendants.findFirst({
      where: { 
        eventId: eventId,
        email: validatedData.email 
      }
    })

    if (existingAttendant) {
      return res.status(400).json({ 
        success: false, 
        error: 'Attendant with this email already exists in this event' 
      })
    }

    // If userId provided, verify user exists
    if (validatedData.userId) {
      const user = await prisma.users.findUnique({
        where: { id: validatedData.userId }
      })
      if (!user) {
        return res.status(400).json({ success: false, error: 'User not found' })
      }
    }

    const attendant = await prisma.event_attendants.create({
      data: {
        id: crypto.randomUUID(),
        eventId: eventId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        congregation: validatedData.congregation,
        formsOfService: validatedData.formsOfService,
        isActive: validatedData.isActive,
        notes: validatedData.notes,
        userId: validatedData.userId,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true
          }
        }
      }
    })

    return res.status(201).json({
      success: true,
      data: attendant
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message })
    }
    console.error('Create event attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create attendant' })
  }
}

async function handleBulkImportEventAttendants(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  try {
    const validatedData = bulkImportSchema.parse(req.body)
    
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number, email: string, error: string }>
    }

    for (let i = 0; i < validatedData.attendants.length; i++) {
      const attendantData = validatedData.attendants[i]
      
      try {
        // Parse forms of service from comma-separated string
        const formsOfService = attendantData.formsOfService
          .split(',')
          .map(form => form.trim())
          .filter(form => FORMS_OF_SERVICE.includes(form as FormOfService)) as FormOfService[]

        // Check if attendant exists in this event
        const existingAttendant = await prisma.event_attendants.findFirst({
          where: { 
            eventId: eventId,
            email: attendantData.email 
          }
        })

        if (existingAttendant) {
          // Update existing attendant
          await prisma.event_attendants.update({
            where: { id: existingAttendant.id },
            data: {
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              phone: attendantData.phone,
              congregation: attendantData.congregation,
              formsOfService,
              isActive: attendantData.isActive,
              notes: attendantData.notes,
              updatedAt: new Date()
            }
          })
          results.updated++
        } else {
          // Create new attendant
          await prisma.event_attendants.create({
            data: {
              id: crypto.randomUUID(),
              eventId: eventId,
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              email: attendantData.email,
              phone: attendantData.phone,
              congregation: attendantData.congregation,
              formsOfService,
              isActive: attendantData.isActive,
              notes: attendantData.notes,
              updatedAt: new Date()
            }
          })
          results.created++
        }
      } catch (error) {
        results.errors.push({
          row: i + 1,
          email: attendantData.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return res.status(200).json({
      success: true,
      data: results
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message })
    }
    console.error('Bulk import event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to import attendants' })
  }
}

async function generateEventAttendantStats(eventId: string) {
  const [
    total,
    active,
    inactive,
    congregationStats,
    formsOfServiceStats,
    withUsers,
    withoutUsers
  ] = await Promise.all([
    prisma.event_attendants.count({ where: { eventId } }),
    prisma.event_attendants.count({ where: { eventId, isActive: true } }),
    prisma.event_attendants.count({ where: { eventId, isActive: false } }),
    prisma.event_attendants.groupBy({
      by: ['congregation'],
      where: { eventId },
      _count: { congregation: true }
    }),
    prisma.event_attendants.findMany({
      where: { eventId },
      select: { formsOfService: true }
    }),
    prisma.event_attendants.count({ where: { eventId, userId: { not: null } } }),
    prisma.event_attendants.count({ where: { eventId, userId: null } })
  ])

  // Process congregation stats
  const byCongregation = congregationStats.reduce((acc, stat) => {
    acc[stat.congregation] = stat._count.congregation
    return acc
  }, {} as Record<string, number>)

  // Process forms of service stats
  const byFormsOfService = {} as Record<FormOfService, number>
  FORMS_OF_SERVICE.forEach(form => {
    byFormsOfService[form] = 0
  })

  formsOfServiceStats.forEach(attendant => {
    const forms = attendant.formsOfService as FormOfService[]
    forms.forEach(form => {
      if (FORMS_OF_SERVICE.includes(form)) {
        byFormsOfService[form]++
      }
    })
  })

  return {
    total,
    active,
    inactive,
    byCongregation,
    byFormsOfService,
    withUsers,
    withoutUsers
  }
}
