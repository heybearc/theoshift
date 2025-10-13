import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

interface AttendantLoginRequest {
  firstName: string
  lastName: string
  congregation: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { firstName, lastName, congregation }: AttendantLoginRequest = req.body

    if (!firstName || !lastName || !congregation) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name, last name, and congregation are required' 
      })
    }

    // Search for attendant by name and congregation
    const attendant = await prisma.attendants.findFirst({
      where: {
        firstName: {
          equals: firstName.trim(),
          mode: 'insensitive'
        },
        lastName: {
          equals: lastName.trim(),
          mode: 'insensitive'
        },
        congregation: {
          equals: congregation.trim(),
          mode: 'insensitive'
        }
      },
      include: {
        event_attendants: {
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
          },
          where: {
            events: {
              status: {
                in: ['UPCOMING', 'CURRENT']
              }
            }
          }
        }
      }
    })

    if (!attendant) {
      return res.status(404).json({ 
        success: false, 
        error: 'Attendant not found. Please check your name and congregation spelling.' 
      })
    }

    // Get active events for this attendant
    const events = attendant.event_attendants.map(ea => ({
      id: ea.events.id,
      name: ea.events.name,
      eventType: ea.events.eventType,
      startDate: ea.events.startDate?.toISOString(),
      endDate: ea.events.endDate?.toISOString(),
      status: ea.events.status
    }))

    if (events.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active events found for your profile. Please contact your overseer.' 
      })
    }

    // Determine if event selection is needed
    const needsEventSelection = events.length > 1

    // If only one event, set it as the default
    const defaultEvent = events.length === 1 ? events[0] : null

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
        events,
        needsEventSelection,
        defaultEvent,
        redirectTo: needsEventSelection ? '/attendant/select-event' : '/attendant/dashboard'
      },
      message: `Welcome, ${attendant.firstName}!`
    })

  } catch (error) {
    console.error('Attendant login error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred during login. Please try again.' 
    })
  }
}
