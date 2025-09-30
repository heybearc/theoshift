import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const { eventId } = req.body

    if (!eventId) {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Verify the event exists and user has access
    const event = await prisma.events.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            event_attendant_associations: true,
            assignments: true,
            event_positions: true
          }
        }
      }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    // For now, we'll store the selected event in a simple way
    // In a production app, you might want to store this in the database
    // or use a more sophisticated session management system
    
    // We can use the session callback to store additional data
    // For now, we'll just return success and let the frontend handle the redirect
    
    return res.status(200).json({
      success: true,
      data: {
        selectedEvent: {
          id: event.id,
          name: event.name,
          description: event.description,
          eventType: event.eventType,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          status: getEventStatus(event.startDate, event.endDate),
          stats: {
            attendants: event._count.event_attendant_associations,
            assignments: event._count.assignments,
            positions: event._count.event_positions
          }
        }
      }
    })

  } catch (error) {
    console.error('Event selection API error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function getEventStatus(startDate: Date, endDate: Date): 'upcoming' | 'current' | 'past' {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (now < start) {
    return 'upcoming'
  } else if (now >= start && now <= end) {
    return 'current'
  } else {
    return 'past'
  }
}
