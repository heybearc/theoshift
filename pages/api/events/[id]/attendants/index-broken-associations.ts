import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// APEX GUARDIAN Event-Specific Attendants API - FIXED VERSION
// Using proper event_attendant_associations architecture

// Validation schemas
const eventAttendantCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  congregation: z.string().min(1, 'Congregation is required'),
  formsOfService: z.array(z.string()),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  userId: z.string().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
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
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 25
    const offset = (page - 1) * limit

    // Get event attendants through associations
    const associations = await prisma.event_attendant_associations.findMany({
      where: { 
        eventId: eventId,
        isActive: true
      },
      include: {
        attendants: true,
        users: true
      },
      skip: offset,
      take: limit,
      orderBy: [
        { attendants: { lastName: 'asc' } },
        { attendants: { firstName: 'asc' } }
      ]
    })

    // Get total count
    const total = await prisma.event_attendant_associations.count({
      where: { 
        eventId: eventId,
        isActive: true
      }
    })

    // Transform data to match expected format
    const attendants = associations.map(assoc => ({
      id: assoc.attendants?.id || assoc.id,
      firstName: assoc.attendants?.firstName || '',
      lastName: assoc.attendants?.lastName || '',
      email: assoc.attendants?.email || '',
      phone: assoc.attendants?.phone || '',
      congregation: assoc.attendants?.congregation || '',
      formsOfService: assoc.attendants?.formsOfService || [],
      isActive: assoc.attendants?.isActive || false,
      notes: assoc.attendants?.notes || '',
      userId: assoc.userId,
      associationId: assoc.id,
      role: assoc.role,
      createdAt: assoc.createdAt,
      updatedAt: assoc.updatedAt
    }))

    const pages = Math.ceil(total / limit)

    return res.status(200).json({
      success: true,
      data: {
        attendants,
        pagination: {
          page,
          limit,
          total,
          pages
        },
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

    // First create or find the attendant
    let attendant = await prisma.attendants.findFirst({
      where: { email: validatedData.email }
    })

    if (!attendant) {
      // Create new attendant
      attendant = await prisma.attendants.create({
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
          userId: validatedData.userId
        }
      })
    }

    // Check if association already exists for this event
    const existingAssociation = await prisma.event_attendant_associations.findFirst({
      where: { 
        eventId: eventId,
        attendantId: attendant.id
      }
    })
    
    if (existingAssociation) {
      return res.status(400).json({ 
        success: false, 
        error: 'Attendant with this email already exists in this event' 
      })
    }

    // Create the event-attendant association
    const association = await prisma.event_attendant_associations.create({
      data: {
        id: crypto.randomUUID(),
        eventId: eventId,
        attendantId: attendant.id,
        userId: validatedData.userId,
        role: 'ATTENDANT',
        isActive: true
      },
      include: {
        attendants: true
      }
    })
    
    return res.status(201).json({
      success: true,
      data: {
        id: attendant.id,
        firstName: attendant.firstName,
        lastName: attendant.lastName,
        email: attendant.email,
        phone: attendant.phone,
        congregation: attendant.congregation,
        formsOfService: attendant.formsOfService,
        isActive: attendant.isActive,
        notes: attendant.notes,
        associationId: association.id,
        role: association.role
      }
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
    const { attendants: attendantsData } = req.body
    
    if (!Array.isArray(attendantsData)) {
      return res.status(400).json({ success: false, error: 'Invalid attendants data' })
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number, email: string, error: string }>
    }

    for (let i = 0; i < attendantsData.length; i++) {
      const attendantData = attendantsData[i]
      
      try {
        // Parse forms of service
        const formsOfService = typeof attendantData.formsOfService === 'string' 
          ? attendantData.formsOfService.split(',').map((s: string) => s.trim())
          : attendantData.formsOfService || []

        // Find or create attendant
        let attendant = await prisma.attendants.findFirst({
          where: { email: attendantData.email }
        })

        if (!attendant) {
          attendant = await prisma.attendants.create({
            data: {
              id: crypto.randomUUID(),
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              email: attendantData.email,
              phone: attendantData.phone,
              congregation: attendantData.congregation,
              formsOfService: formsOfService,
              isActive: attendantData.isActive !== false,
              notes: attendantData.notes
            }
          })
        } else {
          // Update existing attendant
          await prisma.attendants.update({
            where: { id: attendant.id },
            data: {
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              phone: attendantData.phone,
              congregation: attendantData.congregation,
              formsOfService: formsOfService,
              isActive: attendantData.isActive !== false,
              notes: attendantData.notes
            }
          })
        }

        // Check if association exists
        const existingAssociation = await prisma.event_attendant_associations.findFirst({
          where: { 
            eventId: eventId,
            attendantId: attendant.id
          }
        })

        if (!existingAssociation) {
          // Create association
          await prisma.event_attendant_associations.create({
            data: {
              id: crypto.randomUUID(),
              eventId: eventId,
              attendantId: attendant.id,
              role: 'ATTENDANT',
              isActive: true
            }
          })
          results.created++
        } else {
          results.updated++
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
    console.error('Bulk import event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to import attendants' })
  }
}
