import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { handleApiError } from '@/lib/apiError'
import { normalizePhoneForStorage } from '@/lib/formatPhone'
import { volunteerRosterWhere } from '@/lib/volunteerRoster'

// NEW VOLUNTEERS API ENDPOINT
// This API manages volunteers for events
// Volunteers will be available for assignment to positions

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
      return await handleGetEventVolunteers(req, res, eventId, event)
    }

    if (req.method === 'POST') {
      return await handleCreateEventVolunteer(req, res, eventId, event)
    }

    if (req.method === 'PUT') {
      return await handleBulkImportEventVolunteers(req, res, eventId, event)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetEventVolunteers(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    // Roster only (IVS-only imports stay on the IVS tab until promoted)
    const eventVolunteers = await prisma.event_volunteers.findMany({
      where: {
        eventId: eventId,
        isActive: true,
        ...volunteerRosterWhere,
      },
      include: {
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            congregation: true,
            notes: true,
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
        { volunteer: { firstName: 'asc' } },
        { volunteer: { lastName: 'asc' } }
      ]
    })

    // Filter and map to get volunteers with verification data + event-specific role flags
    const activeEventVolunteers = eventVolunteers.filter(ev => ev.volunteer && ev.volunteer.isActive)

    return res.status(200).json({
      success: true,
      volunteers: activeEventVolunteers.map(ev => ({
        id: ev.volunteer!.id,
        name: `${ev.volunteer!.firstName} ${ev.volunteer!.lastName}`,
        firstName: ev.volunteer!.firstName,
        lastName: ev.volunteer!.lastName,
        email: ev.volunteer!.email,
        phone: ev.volunteer!.phone,
        congregation: ev.volunteer!.congregation,
        notes: ev.volunteer!.notes,
        formsOfService: ev.volunteer!.formsOfService,
        isActive: ev.volunteer!.isActive,
        profileVerificationRequired: ev.volunteer!.profileVerificationRequired,
        profileVerifiedAt: ev.volunteer!.profileVerifiedAt,
        isOverseer: ev.isOverseer ?? false,
        isKeyman: ev.isKeyman ?? false,
        assignments: []
      }))
    })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ success: false, error: 'Failed to fetch volunteers' })
  }
}

async function handleCreateEventVolunteer(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    const { firstName, lastName, email, phone, congregation, notes, formsOfService } = req.body

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name, last name, and email are required' 
      })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: 'A valid email is required'
      })
    }

    // Process forms of service
    let processedFormsOfService: string[] = []
    if (formsOfService) {
      if (Array.isArray(formsOfService)) {
        processedFormsOfService = formsOfService
      } else if (typeof formsOfService === 'string') {
        processedFormsOfService = formsOfService.split(',').map((f: string) => f.trim()).filter(Boolean)
      }
    }

    const phoneNormalized = phone ? normalizePhoneForStorage(phone) || null : null

    // Global registry: one person per email — reuse if already in the system
    let volunteer = await prisma.volunteers.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' }
      }
    })

    let createdNew = false

    if (volunteer) {
      // Keep profile fresh when re-adding to an event
      volunteer = await prisma.volunteers.update({
        where: { id: volunteer.id },
        data: {
          firstName,
          lastName,
          phone: phoneNormalized ?? volunteer.phone,
          congregation: congregation || volunteer.congregation || '',
          notes: notes !== undefined && notes !== null ? notes : volunteer.notes,
          formsOfService:
            processedFormsOfService.length > 0
              ? processedFormsOfService
              : volunteer.formsOfService,
          isActive: true,
          updatedAt: new Date()
        }
      })
    } else {
      volunteer = await prisma.volunteers.create({
        data: {
          id: require('crypto').randomUUID(),
          firstName,
          lastName,
          email: normalizedEmail,
          phone: phoneNormalized,
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
      createdNew = true
    }

    // Link to this event (or reactivate existing link)
    const existingAssignment = await prisma.event_volunteers.findFirst({
      where: {
        eventId,
        volunteerId: volunteer.id
      }
    })

    if (existingAssignment) {
      const alreadyOnRoster =
        existingAssignment.isActive && existingAssignment.onVolunteerRoster

      if (alreadyOnRoster) {
        // Idempotent: already on the Volunteers roster — not a failure
        return res.status(200).json({
          success: true,
          data: {
            id: volunteer.id,
            firstName: volunteer.firstName,
            lastName: volunteer.lastName,
            email: volunteer.email,
            phone: volunteer.phone,
            congregation: volunteer.congregation,
            formsOfService: volunteer.formsOfService,
            isActive: volunteer.isActive,
            alreadyOnEvent: true,
            message: 'This volunteer is already on this event'
          }
        })
      }

      // Reactivate and/or promote IVS-only membership onto the Volunteers roster.
      // Keep IVS fields so they remain on the IVS tab.
      const promotedFromIvs =
        !!existingAssignment.ivsImportBatchId && !existingAssignment.onVolunteerRoster

      await prisma.event_volunteers.update({
        where: { id: existingAssignment.id },
        data: {
          isActive: true,
          onVolunteerRoster: true,
          isOverseer: req.body.isOverseer || false,
          isKeyman: req.body.isKeyman || false,
          updatedAt: new Date()
        }
      })

      if (promotedFromIvs) {
        return res.status(200).json({
          success: true,
          data: {
            id: volunteer.id,
            firstName: volunteer.firstName,
            lastName: volunteer.lastName,
            email: volunteer.email,
            phone: volunteer.phone,
            congregation: volunteer.congregation,
            formsOfService: volunteer.formsOfService,
            isActive: volunteer.isActive,
            promotedFromIvs: true,
            message: 'Added to volunteer roster (already on IVS for this event)'
          }
        })
      }
    } else {
      await prisma.event_volunteers.create({
        data: {
          id: require('crypto').randomUUID(),
          eventId,
          volunteerId: volunteer.id,
          role: 'VOLUNTEER',
          isActive: true,
          onVolunteerRoster: true,
          isOverseer: req.body.isOverseer || false,
          isKeyman: req.body.isKeyman || false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    return res.status(createdNew ? 201 : 200).json({
      success: true,
      data: {
        id: volunteer.id,
        firstName: volunteer.firstName,
        lastName: volunteer.lastName,
        email: volunteer.email,
        phone: volunteer.phone,
        congregation: volunteer.congregation,
        formsOfService: volunteer.formsOfService,
        isActive: volunteer.isActive,
        message: createdNew
          ? 'Volunteer created and assigned to event'
          : 'Existing volunteer linked to event'
      }
    })
  } catch (error) {
    console.error('Failed to create volunteer:', error)
    return res.status(500).json({ success: false, error: 'Failed to create volunteer' })
  }
}

async function handleBulkImportEventVolunteers(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    const { attendants } = req.body

    if (!Array.isArray(attendants) || attendants.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Volunteers array is required and must not be empty' 
      })
    }

    console.log(`🔄 Bulk importing ${attendants.length} volunteers`)

    let created = 0
    let updated = 0
    const errors: any[] = []

    for (let i = 0; i < attendants.length; i++) {
      try {
        const volunteerData = attendants[i]

        if (!volunteerData.firstName || !volunteerData.lastName || !volunteerData.email) {
          errors.push({
            row: i + 1,
            email: volunteerData.email || 'Unknown',
            error: 'First name, last name, and email are required'
          })
          continue
        }

        // Check if volunteer already exists by email
        const existingVolunteer = await prisma.volunteers.findFirst({
          where: { email: volunteerData.email }
        })

        if (existingVolunteer) {
          // Process forms of service
          let formsOfService = []
          if (volunteerData.formsOfService) {
            if (Array.isArray(volunteerData.formsOfService)) {
              formsOfService = volunteerData.formsOfService
            } else if (typeof volunteerData.formsOfService === 'string') {
              formsOfService = volunteerData.formsOfService.split(',').map(f => f.trim())
            }
          }

          // Update existing volunteer
          await prisma.volunteers.update({
            where: { id: existingVolunteer.id },
            data: {
              firstName: volunteerData.firstName,
              lastName: volunteerData.lastName,
              phone: volunteerData.phone
                ? normalizePhoneForStorage(volunteerData.phone) || null
                : null,
              congregation: volunteerData.congregation || '',
              notes: volunteerData.notes || null,
              formsOfService: formsOfService,
              isActive: volunteerData.isActive !== false,
              updatedAt: new Date()
            }
          })

          // Check if volunteer is already assigned to this event
          const existingAssignment = await prisma.event_volunteers.findFirst({
            where: {
              eventId: eventId,
              volunteerId: existingVolunteer.id
            }
          })

          // If not assigned, assign to event
          if (!existingAssignment) {
            await prisma.event_volunteers.create({
              data: {
                id: require('crypto').randomUUID(),
                eventId: eventId,
                volunteerId: existingVolunteer.id,
                role: 'VOLUNTEER',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
          } else {
          }

          updated++
        } else {
          // Process forms of service
          let formsOfService = []
          if (volunteerData.formsOfService) {
            if (Array.isArray(volunteerData.formsOfService)) {
              formsOfService = volunteerData.formsOfService
            } else if (typeof volunteerData.formsOfService === 'string') {
              formsOfService = volunteerData.formsOfService.split(',').map(f => f.trim())
            }
          }

          // Create new volunteer
          const newVolunteer = await prisma.volunteers.create({
            data: {
              id: require('crypto').randomUUID(),
              firstName: volunteerData.firstName,
              lastName: volunteerData.lastName,
              email: volunteerData.email,
              phone: volunteerData.phone
                ? normalizePhoneForStorage(volunteerData.phone) || null
                : null,
              congregation: volunteerData.congregation || '',
              notes: volunteerData.notes || null,
              formsOfService: formsOfService,
              isAvailable: volunteerData.isActive !== false,
              isActive: volunteerData.isActive !== false,
              userId: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          // Automatically assign to event
          await prisma.event_volunteers.create({
            data: {
              id: require('crypto').randomUUID(),
              eventId: eventId,
              volunteerId: newVolunteer.id,
              role: 'VOLUNTEER',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          created++
        }
      } catch (error: any) {
        // Error logged by handleApiError
        errors.push({
          row: i + 1,
          email: attendants[i]?.email || 'Unknown',
          error: error.message || 'Unknown error'
        })
      }
    }

    
    if (errors.length > 0) {
      errors.forEach(error => {
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        created,
        updated,
        errors,
        message: `Import complete. ${created + updated} volunteers imported and automatically assigned to the event.`
      }
    })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ success: false, error: 'Failed to import volunteers' })
  }
}
