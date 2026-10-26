import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { checkEventAccess, canManageAttendants } from '../../../../../src/lib/eventAccess'
import { handleApiError } from '@/lib/apiError'
import { normalizePhoneForStorage } from '@/lib/formatPhone'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, volunteerId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (!volunteerId || typeof volunteerId !== 'string') {
    return res.status(400).json({ error: 'Volunteer ID is required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Get current user
    const user = await prisma.users.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Check permissions based on method
    if (req.method === 'GET') {
      // Anyone with event access can view volunteers
      const hasAccess = await checkEventAccess(user.id, eventId, 'VIEWER')
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to view this event' })
      }
      return await handleGetVolunteer(req, res, eventId, volunteerId)
    } else if (req.method === 'PUT' || req.method === 'DELETE') {
      // Only OVERSEER+ can manage volunteers
      const canManage = await canManageAttendants(user.id, eventId)
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to manage volunteers' })
      }
      
      if (req.method === 'PUT') {
        return await handleUpdateVolunteer(req, res, eventId, volunteerId)
      } else {
        return await handleDeleteVolunteer(req, res, eventId, volunteerId)
      }
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetVolunteer(req: NextApiRequest, res: NextApiResponse, eventId: string, volunteerId: string) {
  try {
    const volunteer = await prisma.volunteers.findUnique({
      where: { id: volunteerId }
    })

    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' })
    }

    // APEX GUARDIAN: Event Volunteers page is source of truth for all volunteers
    // All active volunteers are available for this event - no position assignment required

    return res.status(200).json({
      success: true,
      data: {
        id: volunteer.id,
        firstName: volunteer.firstName,
        lastName: volunteer.lastName,
        email: volunteer.email,
        phone: volunteer.phone,
        congregation: (volunteer as any).congregation || '',
        formsOfService: (volunteer as any).formsOfService || [],
        isActive: (volunteer as any).isActive !== false,
        notes: volunteer.notes,
        userId: volunteer.userId,
        createdAt: volunteer.createdAt,
        updatedAt: volunteer.updatedAt
      }
    })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ error: 'Failed to fetch volunteer' })
  }
}

async function handleUpdateVolunteer(req: NextApiRequest, res: NextApiResponse, eventId: string, volunteerId: string) {
  try {
    const { firstName, lastName, email, phone, congregation, notes, formsOfService, isActive, profileVerificationRequired, isOverseer, isKeyman } = req.body


    // Check if volunteer exists
    const existingVolunteer = await prisma.volunteers.findUnique({
      where: { id: volunteerId }
    })
    
    if (!existingVolunteer) {
      console.error(`❌ Volunteer not found: ${volunteerId}`)
      return res.status(404).json({ error: 'Volunteer not found' })
    }

    // APEX GUARDIAN: Event Volunteers page is source of truth for all volunteers
    // No need to check for position assignments - all active volunteers are editable

    // Process forms of service
    let processedFormsOfService: string[] = []
    if (formsOfService) {
      if (Array.isArray(formsOfService)) {
        processedFormsOfService = formsOfService
      } else if (typeof formsOfService === 'string') {
        processedFormsOfService = formsOfService
          .split(',')
          .map(f => f.trim())
          .filter(f => f !== '')
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {}
    
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone ? normalizePhoneForStorage(phone) || null : null
    if (notes !== undefined) {
      const text = typeof notes === 'string' ? notes.trim() : ''
      updateData.notes = text || null
    }
    if (congregation !== undefined) updateData.congregation = congregation || ''
    if (processedFormsOfService.length > 0) updateData.formsOfService = processedFormsOfService
    
    // CRITICAL FIX: Handle isActive properly
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }
    
    // Handle profile verification requirement
    if (profileVerificationRequired !== undefined) {
      updateData.profileVerificationRequired = profileVerificationRequired
    }
    
    updateData.updatedAt = new Date()

    const volunteerUserId = existingVolunteer.userId

    const updatedVolunteer = await prisma.$transaction(async (tx) => {
      const vol = await tx.volunteers.update({
        where: { id: volunteerId },
        data: updateData
      })

      console.log(
        `[ROLE-UPDATE] isOverseer=${JSON.stringify(isOverseer)} isKeyman=${JSON.stringify(isKeyman)} volunteerId=${volunteerId} eventId=${eventId}`
      )
      if (isOverseer !== undefined || isKeyman !== undefined) {
        const eventVolunteerUpdateData: any = {}
        if (isOverseer !== undefined) eventVolunteerUpdateData.isOverseer = isOverseer
        if (isKeyman !== undefined) eventVolunteerUpdateData.isKeyman = isKeyman
        eventVolunteerUpdateData.updatedAt = new Date()

        console.log(`[ROLE-UPDATE] volunteerUserId=${volunteerUserId} updateData=${JSON.stringify(eventVolunteerUpdateData)}`)

        const existing = await tx.event_volunteers.findMany({
          where: {
            eventId: eventId,
            OR: [
              { volunteerId: volunteerId },
              ...(volunteerUserId ? [{ userId: volunteerUserId }] : [])
            ]
          },
          select: { id: true, volunteerId: true, userId: true, isOverseer: true }
        })
        console.log(`[ROLE-UPDATE] Found ${existing.length} matching event_volunteers rows: ${JSON.stringify(existing)}`)

        const updated = await tx.event_volunteers.updateMany({
          where: {
            eventId: eventId,
            OR: [
              { volunteerId: volunteerId },
              ...(volunteerUserId ? [{ userId: volunteerUserId }] : [])
            ]
          },
          data: eventVolunteerUpdateData
        })

        console.log(`[ROLE-UPDATE] updateMany result: count=${updated.count}`)

        if (isOverseer === false) {
          await tx.event_volunteers.updateMany({
            where: {
              eventId: eventId,
              overseerId: volunteerId
            },
            data: {
              overseerId: null
            }
          })

          await tx.position_assignments.updateMany({
            where: {
              positions: { eventId: eventId },
              overseerId: volunteerId
            },
            data: {
              overseerId: null
            }
          })

          await tx.position_oversight_assignments.updateMany({
            where: {
              eventId: eventId,
              overseerId: volunteerId
            },
            data: {
              overseerId: null
            }
          })
        }

        if (isKeyman === false) {
          await tx.event_volunteers.updateMany({
            where: {
              eventId: eventId,
              keymanId: volunteerId
            },
            data: {
              keymanId: null
            }
          })

          await tx.position_assignments.updateMany({
            where: {
              positions: { eventId: eventId },
              keymanId: volunteerId
            },
            data: {
              keymanId: null
            }
          })

          await tx.position_oversight_assignments.updateMany({
            where: {
              eventId: eventId,
              keymanId: volunteerId
            },
            data: {
              keymanId: null
            }
          })
        }
      } else {
        console.log(`[ROLE-UPDATE] Skipped — isOverseer and isKeyman both undefined in request body`)
      }

      return vol
    })

    return res.status(200).json({
      success: true,
      data: {
        id: updatedVolunteer.id,
        firstName: updatedVolunteer.firstName,
        lastName: updatedVolunteer.lastName,
        email: updatedVolunteer.email,
        phone: updatedVolunteer.phone,
        congregation: (updatedVolunteer as any).congregation || '',
        formsOfService: (updatedVolunteer as any).formsOfService || [],
        isActive: (updatedVolunteer as any).isActive !== false,
        notes: updatedVolunteer.notes,
        userId: updatedVolunteer.userId,
        createdAt: updatedVolunteer.createdAt,
        updatedAt: updatedVolunteer.updatedAt
      }
    })
  } catch (error) {
    console.error('[volunteers PUT]', error)
    return res.status(500).json({ error: 'Failed to update volunteer' })
  }
}

async function handleDeleteVolunteer(req: NextApiRequest, res: NextApiResponse, eventId: string, volunteerId: string) {
  try {
    // Check if volunteer exists
    const existingVolunteer = await prisma.volunteers.findUnique({
      where: { id: volunteerId }
    })

    if (!existingVolunteer) {
      return res.status(404).json({ error: 'Volunteer not found' })
    }

    // Get all positions for this event to find assignments
    const eventPositions = await prisma.positions.findMany({
      where: { eventId },
      select: { id: true }
    })
    
    const positionIds = eventPositions.map(p => p.id)

    // Delete the position assignments for this volunteer in this event
    await prisma.position_assignments.deleteMany({
      where: {
        volunteerId,
        positionId: { in: positionIds }
      }
    })

    // Clear event-scoped oversight references where this volunteer is assigned as overseer/keyman.
    await prisma.event_volunteers.updateMany({
      where: {
        eventId,
        overseerId: volunteerId
      },
      data: {
        overseerId: null
      }
    })

    await prisma.event_volunteers.updateMany({
      where: {
        eventId,
        keymanId: volunteerId
      },
      data: {
        keymanId: null
      }
    })

    await prisma.position_assignments.updateMany({
      where: {
        positionId: { in: positionIds },
        overseerId: volunteerId
      },
      data: {
        overseerId: null
      }
    })

    await prisma.position_assignments.updateMany({
      where: {
        positionId: { in: positionIds },
        keymanId: volunteerId
      },
      data: {
        keymanId: null
      }
    })

    await prisma.position_oversight_assignments.updateMany({
      where: {
        eventId,
        overseerId: volunteerId
      },
      data: {
        overseerId: null
      }
    })

    await prisma.position_oversight_assignments.updateMany({
      where: {
        eventId,
        keymanId: volunteerId
      },
      data: {
        keymanId: null
      }
    })

    // Check if volunteer has assignments in other events
    const otherAssignments = await prisma.position_assignments.findMany({
      where: { volunteerId }
    })

    // Only delete the volunteer record if they have no other assignments
    if (otherAssignments.length === 0) {
      await prisma.volunteers.delete({
        where: { id: volunteerId }
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Volunteer removed from event'
    })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ error: 'Failed to delete volunteer' })
  }
}
