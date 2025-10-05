import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { firstName, lastName, eventId } = req.query

    if (!firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name and last name are required' 
      })
    }

    // Find attendant by name
    const attendant = await prisma.attendants.findFirst({
      where: {
        firstName: {
          equals: firstName as string,
          mode: 'insensitive'
        },
        lastName: {
          equals: lastName as string,
          mode: 'insensitive'
        },
        isActive: true
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    if (!attendant) {
      return res.status(404).json({ 
        success: false, 
        error: 'Attendant not found' 
      })
    }

    // If eventId provided, get event-specific information
    let eventAssignments = []
    if (eventId) {
      // Get assignments for this attendant in the specific event
      const assignments = await prisma.assignments.findMany({
        where: {
          eventId: eventId as string,
          OR: [
            { userId: attendant.userId },
            // For attendants without user accounts, we'll need to match by attendant data
            // This would require additional logic to match attendant to assignments
          ]
        },
        include: {
          event_positions: {
            select: {
              positionName: true,
              department: true,
              description: true
            }
          },
          position_shifts: {
            select: {
              shiftName: true,
              startTime: true,
              endTime: true
            }
          }
        }
      })

      eventAssignments = assignments
    }

    return res.status(200).json({
      success: true,
      data: {
        attendant: {
          id: attendant.id,
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          email: attendant.email,
          phone: attendant.phone,
          congregation: attendant.congregation,
          formsOfService: attendant.formsOfService,
          hasUserAccount: !!attendant.userId
        },
        assignments: eventAssignments
      }
    })

  } catch (error) {
    console.error('Attendant lookup error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}
