import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

// APEX GUARDIAN - NEW SYSTEM IMPORT API
// This API imports attendants but doesn't create position assignments
// Attendants will be available for assignment but won't show in displays until assigned to positions

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
    // Get attendants from event_attendants table with proper Prisma relations
    const eventAttendants = await prisma.event_attendants.findMany({
      where: {
        eventId: eventId,
        isActive: true
      },
      include: {
        attendants_event_attendants_attendantIdToattendants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            congregation: true,
            formsOfService: true,
            isActive: true,
            profileVerificationRequired: true,
            profileVerifiedAt: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: [
        { attendants_event_attendants_attendantIdToattendants: { firstName: 'asc' } },
        { attendants_event_attendants_attendantIdToattendants: { lastName: 'asc' } }
      ]
    })

    // Filter and map to get attendants with verification data
    const attendantsWithAssignments = eventAttendants
      .filter(ea => ea.attendants_event_attendants_attendantIdToattendants && ea.attendants_event_attendants_attendantIdToattendants.isActive)
      .map(ea => ea.attendants_event_attendants_attendantIdToattendants!)

    return res.status(200).json({
      success: true,
      data: attendantsWithAssignments.map(attendant => ({
        id: attendant.id,
        firstName: attendant.firstName,
        lastName: attendant.lastName,
        email: attendant.email,
        phone: attendant.phone,
        congregation: attendant.congregation,
        formsOfService: attendant.formsOfService,
        isActive: attendant.isActive,
        profileVerificationRequired: attendant.profileVerificationRequired,
        profileVerifiedAt: attendant.profileVerifiedAt,
        // Note: Position assignments are now separate from attendant data
        // They can be fetched separately if needed via positions API
        assignments: []
      }))
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
    let processedFormsOfService: string[] = []
    if (formsOfService) {
      if (Array.isArray(formsOfService)) {
        processedFormsOfService = formsOfService
      } else if (typeof formsOfService === 'string') {
        processedFormsOfService = formsOfService.split(',').map(f => f.trim())
      }
    }

    // Create new attendant (no automatic position assignment)
    const attendant = await prisma.attendants.create({
      data: {
        id: require('crypto').randomUUID(),
        firstName,
        lastName,
        email,
        phone: phone || null,
        congregation: congregation || '',
        notes: notes || null,
        formsOfService: processedFormsOfService,
        isAvailable: true,
        isActive: true,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // NOTE: No position assignment created - attendant is available for assignment
    console.log(`✅ Created attendant ${firstName} ${lastName} - available for position assignment`)

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
        message: 'Attendant created and available for position assignment'
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

    if (!Array.isArray(attendants) || attendants.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Attendants array is required and must not be empty' 
      })
    }

    console.log(`🔄 APEX GUARDIAN: Bulk importing ${attendants.length} attendants to NEW system`)

    let created = 0
    let updated = 0
    const errors: any[] = []

    for (let i = 0; i < attendants.length; i++) {
      try {
        const attendantData = attendants[i]

        if (!attendantData.firstName || !attendantData.lastName || !attendantData.email) {
          errors.push({
            row: i + 1,
            email: attendantData.email || 'Unknown',
            error: 'First name, last name, and email are required'
          })
          continue
        }

        // Check if attendant already exists by email
        const existingAttendant = await prisma.attendants.findFirst({
          where: { email: attendantData.email }
        })

        if (existingAttendant) {
          // Process forms of service
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
              congregation: attendantData.congregation || '',
              notes: attendantData.notes || null,
              formsOfService: formsOfService,
              isActive: attendantData.isActive !== false,
              updatedAt: new Date()
            }
          })

          updated++
          console.log(`✅ Updated attendant: ${attendantData.firstName} ${attendantData.lastName}`)
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

          // Create new attendant (no position assignment)
          await prisma.attendants.create({
            data: {
              id: require('crypto').randomUUID(),
              firstName: attendantData.firstName,
              lastName: attendantData.lastName,
              email: attendantData.email,
              phone: attendantData.phone || null,
              congregation: attendantData.congregation || '',
              notes: attendantData.notes || null,
              formsOfService: formsOfService,
              isAvailable: attendantData.isActive !== false,
              isActive: attendantData.isActive !== false,
              userId: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          created++
          console.log(`✅ Created attendant: ${attendantData.firstName} ${attendantData.lastName}`)
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

    console.log(`🎯 APEX GUARDIAN Import Complete: ${created} created, ${updated} updated, ${errors.length} errors`)
    console.log(`📝 NOTE: Attendants are available for position assignment but won't appear in displays until assigned`)

    return res.status(200).json({
      success: true,
      data: {
        created,
        updated,
        errors,
        message: `Import complete. ${created + updated} attendants are now available for position assignment.`
      }
    })
  } catch (error) {
    console.error('Bulk import event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to import attendants' })
  }
}
