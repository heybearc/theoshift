import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

// MINIMAL WORKING API - Just return existing attendants
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

    if (req.method === 'GET') {
      return await handleGetEventAttendants(req, res, eventId, event)
    }

    if (req.method === 'POST') {
      return await handleCreateEventAttendant(req, res, eventId, event)
    }

    if (req.method === 'PUT') {
      return await handleBulkImportEventAttendants(req, res, eventId, event)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Event attendants API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetEventAttendants(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 25
    const offset = (page - 1) * limit

    // Get all attendants - simplified approach
    const attendants = await prisma.attendants.findMany({
      skip: offset,
      take: limit,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    })

    const total = await prisma.attendants.count()
    const pages = Math.ceil(total / limit)

    return res.status(200).json({
      success: true,
      data: {
        attendants: attendants.map(attendant => ({
          id: attendant.id,
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          email: attendant.email,
          phone: attendant.phone,
          congregation: (attendant as any).congregation || '',
          formsOfService: [],
          isActive: true,
          notes: attendant.notes,
          userId: attendant.userId,
          createdAt: attendant.createdAt,
          updatedAt: attendant.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages
        },
        eventId,
        eventName: (event as any).name || 'Event'
      }
    })
  } catch (error) {
    console.error('Get event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch attendants' })
  }
}

async function handleCreateEventAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    const { firstName, lastName, email, phone, congregation, notes, formsOfService } = req.body

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name, last name, and email are required' 
      })
    }

    // Process forms of service
    let processedFormsOfService = []
    if (formsOfService) {
      if (Array.isArray(formsOfService)) {
        processedFormsOfService = formsOfService
      } else if (typeof formsOfService === 'string') {
        processedFormsOfService = formsOfService.split(',').map(f => f.trim())
      }
    }

    // Create new attendant
    const attendant = await prisma.attendants.create({
      data: {
        id: require('crypto').randomUUID(),
        firstName,
        lastName,
        email,
        phone: phone || null,
        notes: notes || null,
        congregation: congregation || '',
        formsOfService: processedFormsOfService,
        isAvailable: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create association with the event
    await prisma.event_attendant_associations.create({
      data: {
        id: require('crypto').randomUUID(),
        eventId,
        attendantId: attendant.id
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
        congregation: congregation || '',
        formsOfService: [],
        isActive: true,
        notes: attendant.notes,
        userId: attendant.userId,
        createdAt: attendant.createdAt,
        updatedAt: attendant.updatedAt
      }
    })
  } catch (error) {
    console.error('Create event attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to create attendant' })
  }
}

async function handleBulkImportEventAttendants(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    const { attendants } = req.body

    if (!attendants || !Array.isArray(attendants)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Attendants array is required' 
      })
    }

    let created = 0
    let updated = 0
    const errors = []

    for (let i = 0; i < attendants.length; i++) {
      const attendantData = attendants[i]
      
      try {
        // Check if attendant already exists by email
        const existingAttendant = await prisma.attendants.findFirst({
          where: { email: attendantData.email }
        })

        if (existingAttendant) {
          // Process forms of service for update
          let formsOfService = []
          if (attendantData.formsOfService) {
            if (Array.isArray(attendantData.formsOfService)) {
              formsOfService = attendantData.formsOfService
            } else if (typeof attendantData.formsOfService === 'string') {
              formsOfService = attendantData.formsOfService.split(',').map(f => f.trim())
            }
          }

          // Update existing attendant
          await prisma.attendants.update({
            where: { id: existingAttendant.id },
            data: {
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              phone: attendantData.phone || null,
              notes: attendantData.notes || null,
              congregation: attendantData.congregation || '',
              formsOfService: formsOfService,
              isAvailable: attendantData.isActive !== false,
              updatedAt: new Date()
            }
          })

          // Create association if it doesn't exist
          const existingAssociation = await prisma.event_attendant_associations.findFirst({
            where: {
              eventId,
              attendantId: existingAttendant.id
            }
          })

          if (!existingAssociation) {
            await prisma.event_attendant_associations.create({
              data: {
                id: require('crypto').randomUUID(),
                eventId,
                attendantId: existingAttendant.id
              }
            })
          }

          updated++
        } else {
          // Process forms of service
          let formsOfService = []
          if (attendantData.formsOfService) {
            if (Array.isArray(attendantData.formsOfService)) {
              formsOfService = attendantData.formsOfService
            } else if (typeof attendantData.formsOfService === 'string') {
              formsOfService = attendantData.formsOfService.split(',').map(f => f.trim())
            }
          }

          // Create new attendant
          const newAttendant = await prisma.attendants.create({
            data: {
              id: require('crypto').randomUUID(),
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              email: attendantData.email,
              phone: attendantData.phone || null,
              notes: attendantData.notes || null,
              congregation: attendantData.congregation || '',
              formsOfService: formsOfService,
              isAvailable: attendantData.isActive !== false,
              isActive: attendantData.isActive !== false,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          // Create association with the event
          await prisma.event_attendant_associations.create({
            data: {
              id: require('crypto').randomUUID(),
              eventId,
              attendantId: newAttendant.id
            }
          })

          created++
        }
      } catch (error) {
        console.error(`Error processing attendant ${i + 1}:`, error)
        errors.push({
          row: i + 1,
          email: attendantData.email || 'Unknown',
          error: error.message || 'Unknown error'
        })
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        created,
        updated,
        errors
      }
    })
  } catch (error) {
    console.error('Bulk import event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to import attendants' })
  }
}
