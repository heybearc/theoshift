import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'
import bcrypt from 'bcryptjs'

interface AttendantLoginRequest {
  firstName: string
  lastName: string
  congregation: string
  pin: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🟢 Attendant login API called')
  
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method)
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { firstName, lastName, congregation, pin }: AttendantLoginRequest = req.body
    console.log('🟢 Login attempt:', { firstName, lastName, congregation, pin: '****' })

    if (!firstName || !lastName || !congregation || !pin) {
      console.log('❌ Missing fields')
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      })
    }

    // Search for attendant by name and congregation
    console.log('🔍 Searching for attendant in database...')
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
      console.log('❌ Attendant not found in database')
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid credentials. Please check your information.' 
      })
    }
    
    console.log('✅ Found attendant:', attendant.id)
    
    // Verify PIN
    if (!attendant.pinHash) {
      console.log('❌ No PIN set for attendant')
      return res.status(403).json({ 
        success: false, 
        error: 'No PIN set. Please contact your overseer.' 
      })
    }
    
    const pinValid = await bcrypt.compare(pin, attendant.pinHash)
    if (!pinValid) {
      console.log('❌ Invalid PIN')
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid PIN. Please try again.' 
      })
    }
    
    console.log('✅ PIN verified')

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
