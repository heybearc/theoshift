import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { attendantId, eventId } = req.query

    if (!attendantId || !eventId || typeof attendantId !== 'string' || typeof eventId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Attendant ID and Event ID are required' 
      })
    }

    // Verify attendant exists and is part of this event
    const attendant = await prisma.attendants.findFirst({
      where: {
        id: attendantId,
        event_attendants: {
          some: {
            eventId: eventId
          }
        }
      },
      include: {
        event_attendants: {
          where: {
            eventId: eventId
          },
          include: {
            events: true
          }
        }
      }
    })

    if (!attendant || attendant.event_attendants.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Attendant not found or not assigned to this event' 
      })
    }

    const event = attendant.event_attendants[0].events

    // Get attendant's assignments for this event
    // TODO: Implement when assignment system is ready
    const assignments = []

    // Get documents published to this attendant for this event
    // TODO: Implement when document publishing database is ready
    const documents = []

    // Get oversight contacts for this attendant/event
    // TODO: Implement when oversight system is ready
    const oversight = [
      {
        name: event.attendantoverseername || 'Not Assigned',
        role: 'Attendant Overseer',
        phone: event.attendantoverseerphone || undefined,
        email: event.attendantoverseeremail || undefined
      },
      {
        name: event.assemblyoverseername || 'Not Assigned',
        role: 'Assembly Overseer',
        phone: event.assemblyoverseerphone || undefined,
        email: event.assemblyoverseeremail || undefined
      }
    ].filter(contact => contact.name !== 'Not Assigned')

    return res.status(200).json({
      success: true,
      data: {
        attendant: {
          id: attendant.id,
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          congregation: attendant.congregation,
          email: attendant.email,
          phone: attendant.phone
        },
        event: {
          id: event.id,
          name: event.name,
          eventType: event.eventType,
          startDate: event.startDate?.toISOString(),
          endDate: event.endDate?.toISOString(),
          status: event.status
        },
        assignments,
        documents,
        oversight
      }
    })

  } catch (error) {
    console.error('Attendant dashboard error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred while loading dashboard data' 
    })
  }
}
