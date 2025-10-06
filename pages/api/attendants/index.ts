import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { FormOfService, FORMS_OF_SERVICE } from '../../../src/types/attendant'

// Validation schemas
const attendantCreateSchema = z.object({
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

const attendantUpdateSchema = attendantCreateSchema.partial()

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
  })),
  eventId: z.string().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetAttendants(req, res)
      case 'POST':
        return await handleCreateAttendant(req, res)
      case 'PUT':
        return await handleBulkImport(req, res)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Attendants API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetAttendants(req: NextApiRequest, res: NextApiResponse) {
  const { 
    page = '1', 
    limit = '10', 
    search = '', 
    congregation = '',
    formsOfService = '',
    isActive = '',
    hasUser = '',
    includeStats = 'false',
    eventId = ''
  } = req.query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  // Build where clause
  const where: any = {}

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

  if (hasUser !== '') {
    if (hasUser === 'true') {
      where.userId = { not: null }
    } else {
      where.userId = null
    }
  }

  // For event-specific attendants, we'll handle this after the main query
  let eventAssociatedIds: string[] = []
  if (eventId) {
    // Get attendant IDs associated with this event
    const associations = await prisma.event_attendant_associations.findMany({
      where: { 
        eventId: eventId as string,
        isActive: true
      },
      select: { userId: true, attendantId: true } as any
    })
    
    // Collect both user-based and direct attendant associations
    const userIds = associations.filter(a => a.userId).map(a => a.userId!)
    const attendantIds = associations.filter(a => (a as any).attendantId).map(a => (a as any).attendantId!)
    
    // Get attendants by user IDs
    if (userIds.length > 0) {
      const userAttendants = await prisma.attendants.findMany({
        where: { userId: { in: userIds } },
        select: { id: true }
      })
      eventAssociatedIds.push(...userAttendants.map(a => a.id))
    }
    
    // Add direct attendant IDs
    eventAssociatedIds.push(...attendantIds)
    
    // Filter by associated attendants
    if (eventAssociatedIds.length > 0) {
      where.id = { in: eventAssociatedIds }
    } else {
      // No attendants associated with this event
      where.id = { in: [] } // This will return no results
    }
  }

  try {
    const [attendants, total] = await Promise.all([
      prisma.attendants.findMany({
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
              congregation: true,
              role: true,
              isActive: true
            }
          }
        }
      }),
      prisma.attendants.count({ where })
    ])

    let stats: any = undefined
    if (includeStats === 'true') {
      stats = await generateAttendantStats()
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
        stats
      }
    })
  } catch (error) {
    console.error('Get attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch attendants' })
  }
}

async function handleCreateAttendant(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = attendantCreateSchema.parse(req.body)

    // Check if attendant with email already exists
    const existingAttendant = await prisma.attendants.findFirst({
      where: { email: validatedData.email }
    })

    if (existingAttendant) {
      return res.status(400).json({ success: false, error: 'Attendant with this email already exists' })
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

    const attendant = await prisma.attendants.create({
      data: {
        id: crypto.randomUUID(),
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
            congregation: true,
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
    console.error('Create attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create attendant' })
  }
}

async function handleBulkImport(req: NextApiRequest, res: NextApiResponse) {
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

        // Check if attendant exists
        const existingAttendant = await prisma.attendants.findFirst({
          where: { email: attendantData.email }
        })

        if (existingAttendant) {
          // Update existing attendant
          await prisma.attendants.update({
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
          await prisma.attendants.create({
            data: {
              id: crypto.randomUUID(),
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

        // If eventId provided, associate with event
        if (validatedData.eventId) {
          const attendant = await prisma.attendants.findFirst({
            where: { email: attendantData.email }
          })
          
          if (attendant) {
            if (attendant.userId) {
              // Create user-based association for attendants with user accounts
              await prisma.event_attendant_associations.upsert({
                where: {
                  eventId_userId: {
                    eventId: validatedData.eventId,
                    userId: attendant.userId
                  }
                },
                create: {
                  id: crypto.randomUUID(),
                  eventId: validatedData.eventId,
                  userId: attendant.userId,
                  isActive: true,
                  updatedAt: new Date()
                },
                update: {
                  isActive: true,
                  updatedAt: new Date()
                }
              })
            } else {
              // Create attendant-based association for attendants without user accounts
              await prisma.event_attendant_associations.upsert({
                where: {
                  eventId_attendantId: {
                    eventId: validatedData.eventId,
                    attendantId: attendant.id
                  }
                },
                create: {
                  id: crypto.randomUUID(),
                  eventId: validatedData.eventId,
                  attendantId: attendant.id,
                  isActive: true,
                  updatedAt: new Date()
                },
                update: {
                  isActive: true,
                  updatedAt: new Date()
                }
              })
            }
          }
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
    console.error('Bulk import error:', error)
    return res.status(500).json({ success: false, error: 'Failed to import attendants' })
  }
}

async function generateAttendantStats() {
  const [
    total,
    active,
    inactive,
    congregationStats,
    formsOfServiceStats,
    withUsers,
    withoutUsers
  ] = await Promise.all([
    prisma.attendants.count(),
    prisma.attendants.count({ where: { isActive: true } }),
    prisma.attendants.count({ where: { isActive: false } }),
    prisma.attendants.groupBy({
      by: ['congregation'],
      _count: { congregation: true }
    }),
    prisma.attendants.findMany({
      select: { formsOfService: true }
    }),
    prisma.attendants.count({ where: { userId: { not: null } } }),
    prisma.attendants.count({ where: { userId: null } })
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
