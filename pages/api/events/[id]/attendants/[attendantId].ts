import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, attendantId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (!attendantId || typeof attendantId !== 'string') {
    return res.status(400).json({ error: 'Attendant ID is required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (req.method === 'GET') {
      return await handleGetAttendant(req, res, eventId, attendantId)
    } else if (req.method === 'PUT') {
      return await handleUpdateAttendant(req, res, eventId, attendantId)
    } else if (req.method === 'DELETE') {
      return await handleDeleteAttendant(req, res, eventId, attendantId)
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Attendant API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  try {
    const attendant = await prisma.attendants.findUnique({
      where: { id: attendantId }
    })

    if (!attendant) {
      return res.status(404).json({ error: 'Attendant not found' })
    }

    // Check if attendant is associated with the event (NEW SYSTEM - position assignments)
    const positionAssignment = await prisma.position_assignments.findFirst({
      where: {
        attendantId,
        position: {
          eventId
        }
      }
    })

    if (!positionAssignment) {
      return res.status(404).json({ error: 'Attendant not associated with this event' })
    }

    return res.status(200).json({
      success: true,
      data: {
        id: attendant.id,
        firstName: attendant.firstName,
        lastName: attendant.lastName,
        email: attendant.email,
        phone: attendant.phone,
        congregation: (attendant as any).congregation || '',
        formsOfService: (attendant as any).formsOfService || [],
        isActive: (attendant as any).isActive !== false,
        notes: attendant.notes,
        userId: attendant.userId,
        createdAt: attendant.createdAt,
        updatedAt: attendant.updatedAt
      }
    })
  } catch (error) {
    console.error('Get attendant error:', error)
    return res.status(500).json({ error: 'Failed to fetch attendant' })
  }
}

async function handleUpdateAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  try {
    const { firstName, lastName, email, phone, congregation, notes, formsOfService, isActive } = req.body

    console.log(`🔧 API Update attendant ${attendantId}:`, { firstName, lastName, isActive, congregation, formsOfService })

    // Check if attendant exists
    const existingAttendant = await prisma.attendants.findUnique({
      where: { id: attendantId }
    })
    
    if (!existingAttendant) {
      console.error(`❌ Attendant not found: ${attendantId}`)
      return res.status(404).json({ error: 'Attendant not found' })
    }

    // Verify attendant is associated with this event (NEW SYSTEM - position assignments)
    const positionAssignment = await prisma.position_assignments.findFirst({
      where: {
        attendantId,
        position: {
          eventId
        }
      }
    })
    
    if (!positionAssignment) {
      console.error(`❌ Attendant ${attendantId} not associated with event ${eventId}`)
      return res.status(404).json({ error: 'Attendant not associated with this event' })
    }

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
    if (phone !== undefined) updateData.phone = phone || null
    if (notes !== undefined) updateData.notes = notes || null
    if (congregation !== undefined) updateData.congregation = congregation || ''
    if (processedFormsOfService.length > 0) updateData.formsOfService = processedFormsOfService
    
    // CRITICAL FIX: Handle isActive properly
    if (isActive !== undefined) {
      updateData.isActive = isActive
      console.log(`🔧 Setting isActive to: ${isActive} (type: ${typeof isActive})`)
    }
    
    updateData.updatedAt = new Date()

    console.log(`📡 Updating attendant ${attendantId} with data:`, updateData)

    // Update attendant
    const updatedAttendant = await prisma.attendants.update({
      where: { id: attendantId },
      data: updateData
    })

    console.log(`✅ Successfully updated attendant ${attendantId}:`, {
      isActive: (updatedAttendant as any).isActive,
      congregation: (updatedAttendant as any).congregation
    })

    return res.status(200).json({
      success: true,
      data: {
        id: updatedAttendant.id,
        firstName: updatedAttendant.firstName,
        lastName: updatedAttendant.lastName,
        email: updatedAttendant.email,
        phone: updatedAttendant.phone,
        congregation: (updatedAttendant as any).congregation || '',
        formsOfService: (updatedAttendant as any).formsOfService || [],
        isActive: (updatedAttendant as any).isActive !== false,
        notes: updatedAttendant.notes,
        userId: updatedAttendant.userId,
        createdAt: updatedAttendant.createdAt,
        updatedAt: updatedAttendant.updatedAt
      }
    })
  } catch (error) {
    console.error('Update attendant error:', error)
    return res.status(500).json({ error: 'Failed to update attendant' })
  }
}

async function handleDeleteAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  try {
    // Check if attendant exists
    const existingAttendant = await prisma.attendants.findUnique({
      where: { id: attendantId }
    })

    if (!existingAttendant) {
      return res.status(404).json({ error: 'Attendant not found' })
    }

    // Delete the position assignments first (NEW SYSTEM)
    await prisma.position_assignments.deleteMany({
      where: {
        attendantId,
        position: {
          eventId
        }
      }
    })

    // Optionally delete the attendant if not associated with other events
    const otherAssignments = await prisma.position_assignments.findMany({
      where: { attendantId }
    })

    if (otherAssignments.length === 0) {
      await prisma.attendants.delete({
        where: { id: attendantId }
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Attendant removed from event'
    })
  } catch (error) {
    console.error('Delete attendant error:', error)
    return res.status(500).json({ error: 'Failed to delete attendant' })
  }
}
