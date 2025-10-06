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
        return res.status(501).json({ success: false, error: 'Create functionality temporarily disabled' })
      case 'PUT':
        return res.status(501).json({ success: false, error: 'Bulk import functionality temporarily disabled' })
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
    // Use simple template literals for now to avoid parameter binding issues
    let whereClause = `WHERE event_id = '${eventId}'`
    
    if (search) {
      whereClause += ` AND (first_name ILIKE '%${search}%' OR last_name ILIKE '%${search}%' OR email ILIKE '%${search}%' OR congregation ILIKE '%${search}%')`
    }
    
    if (congregation) {
      whereClause += ` AND congregation ILIKE '%${congregation}%'`
    }
    
    if (isActive !== '') {
      whereClause += ` AND is_active = ${isActive === 'true'}`
    }

    const [attendants, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT * FROM event_attendants 
        ${whereClause}
        ORDER BY last_name ASC, first_name ASC
        LIMIT ${limitNum} OFFSET ${skip}
      `) as Promise<any[]>,
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM event_attendants 
        ${whereClause}
      `) as Promise<any[]>
    ])
    
    const total = parseInt(totalResult[0]?.count || '0')

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

// Temporarily disabled - will be implemented in next phase

// Temporarily disabled - will be implemented in next phase

async function generateEventAttendantStats(eventId: string) {
  // Simplified stats using raw queries
  const totalResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM event_attendants WHERE event_id = ${eventId}
  ` as any[]
  
  const activeResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM event_attendants WHERE event_id = ${eventId} AND is_active = true
  ` as any[]

  const total = parseInt(totalResult[0]?.count || '0')
  const active = parseInt(activeResult[0]?.count || '0')
  const inactive = total - active

  return {
    total,
    active,
    inactive,
    byCongregation: {},
    byFormsOfService: {},
    withUsers: 0,
    withoutUsers: total
  }
}
