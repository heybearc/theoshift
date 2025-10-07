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

    // Check if attendant is associated with the event
    const association = await prisma.event_attendant_associations.findFirst({
      where: {
        eventId,
        attendantId
      }
    })

    if (!association) {
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

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name, last name, and email are required' 
      })
    }

    // Check if attendant exists
    const existingAttendant = await prisma.attendants.findUnique({
      where: { id: attendantId }
    })
    if (!existingAttendant) {
      return res.status(404).json({ error: 'Attendant not found' })
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

    // Update attendant
    const updatedAttendant = await prisma.attendants.update({
      where: { id: attendantId },
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        notes: notes || null,
        congregation: congregation || '',
        formsOfService: processedFormsOfService,
        isActive: isActive !== false,
        updatedAt: new Date()
      }
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

    // Delete the association first
    await prisma.event_attendant_associations.deleteMany({
      where: {
        eventId,
        attendantId
      }
    })

    // Optionally delete the attendant if not associated with other events
    const otherAssociations = await prisma.event_attendant_associations.findMany({
      where: { attendantId }
    })

    if (otherAssociations.length === 0) {
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
