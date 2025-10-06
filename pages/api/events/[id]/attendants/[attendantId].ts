import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'
import { FormOfService, FORMS_OF_SERVICE } from '../../../../../../src/types/attendant'

// APEX GUARDIAN Event-Specific Individual Attendant API
// Industry best practice: Event-scoped CRUD operations

const eventAttendantUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional(),
  congregation: z.string().min(1, 'Congregation is required').optional(),
  formsOfService: z.array(z.enum(['Elder', 'Ministerial Servant', 'Exemplary', 'Regular Pioneer', 'Other Department'])).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  userId: z.string().optional()
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

    // Extract parameters
    const { id: eventId, attendantId } = req.query
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }
    if (!attendantId || typeof attendantId !== 'string') {
      return res.status(400).json({ success: false, error: 'Attendant ID is required' })
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
        return await handleGetEventAttendant(req, res, eventId, attendantId)
      case 'PUT':
        return await handleUpdateEventAttendant(req, res, eventId, attendantId)
      case 'DELETE':
        return await handleDeleteEventAttendant(req, res, eventId, attendantId)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event attendant API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetEventAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  try {
    const attendant = await prisma.event_attendants.findFirst({
      where: { 
        id: attendantId,
        eventId: eventId // Ensure attendant belongs to this event
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

    if (!attendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found in this event' })
    }

    return res.status(200).json({
      success: true,
      data: attendant
    })
  } catch (error) {
    console.error('Get event attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch attendant' })
  }
}

async function handleUpdateEventAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  try {
    const validatedData = eventAttendantUpdateSchema.parse(req.body)

    // Check if attendant exists and belongs to this event
    const existingAttendant = await prisma.event_attendants.findFirst({
      where: { 
        id: attendantId,
        eventId: eventId
      }
    })

    if (!existingAttendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found in this event' })
    }

    // If email is being updated, check for conflicts within the event
    if (validatedData.email && validatedData.email !== existingAttendant.email) {
      const emailConflict = await prisma.event_attendants.findFirst({
        where: { 
          eventId: eventId,
          email: validatedData.email,
          id: { not: attendantId }
        }
      })

      if (emailConflict) {
        return res.status(400).json({ 
          success: false, 
          error: 'Another attendant in this event already has this email' 
        })
      }
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

    const updatedAttendant = await prisma.event_attendants.update({
      where: { id: attendantId },
      data: {
        ...validatedData,
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

    return res.status(200).json({
      success: true,
      data: updatedAttendant
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message })
    }
    console.error('Update event attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to update attendant' })
  }
}

async function handleDeleteEventAttendant(req: NextApiRequest, res: NextApiResponse, eventId: string, attendantId: string) {
  try {
    // Check if attendant exists and belongs to this event
    const existingAttendant = await prisma.event_attendants.findFirst({
      where: { 
        id: attendantId,
        eventId: eventId
      }
    })

    if (!existingAttendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found in this event' })
    }

    // Delete the attendant (cascade will handle related records)
    await prisma.event_attendants.delete({
      where: { id: attendantId }
    })

    return res.status(200).json({
      success: true,
      message: 'Attendant deleted successfully'
    })
  } catch (error) {
    console.error('Delete event attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to delete attendant' })
  }
}
