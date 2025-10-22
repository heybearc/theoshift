import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { attendantId } = req.query

    if (!attendantId || typeof attendantId !== 'string') {
      return res.status(400).json({ success: false, error: 'Attendant ID is required' })
    }

    // Fetch events for this attendant
    const eventAttendants = await prisma.event_attendants.findMany({
      where: {
        attendantId,
        events: {
          status: {
            in: ['UPCOMING', 'CURRENT']
          }
        }
      },
      include: {
        events: {
          select: {
            id: true,
            name: true,
            eventType: true,
            startDate: true,
            endDate: true,
            status: true
          }
        }
      }
    })

    const events = eventAttendants.map(ea => ({
      id: ea.events.id,
      name: ea.events.name,
      eventType: ea.events.eventType,
      startDate: ea.events.startDate?.toISOString(),
      endDate: ea.events.endDate?.toISOString(),
      status: ea.events.status
    }))

    return res.status(200).json({
      success: true,
      data: { events }
    })

  } catch (error) {
    console.error('Attendant events error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch events' 
    })
  }
}
