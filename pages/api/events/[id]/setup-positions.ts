import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  try {
    // Create event positions using proper Prisma
    const positions = [
      {
        eventId: eventId,
        positionNumber: 22,
        positionName: 'Station 22 - Inside Entrance Near Parking Lot - Morning 1',
        description: 'Inside entrance near parking lot - Morning shift',
        department: 'ATTENDANT',
        isActive: true,
        maxAttendants: 1,
        minAttendants: 1
      },
      {
        eventId: eventId,
        positionNumber: 15,
        positionName: 'Station 15 - Main Auditorium - Morning 2', 
        description: 'Main auditorium oversight - Morning shift',
        department: 'ATTENDANT',
        isActive: true,
        maxAttendants: 1,
        minAttendants: 1
      },
      {
        eventId: eventId,
        positionNumber: 10,
        positionName: 'Station 10 - Information Desk',
        description: 'Information and assistance desk',
        department: 'ATTENDANT', 
        isActive: true,
        maxAttendants: 2,
        minAttendants: 1
      },
      {
        eventId: eventId,
        positionNumber: 5,
        positionName: 'Station 5 - Platform Oversight',
        description: 'Platform and stage area oversight',
        department: 'ATTENDANT',
        isActive: true,
        maxAttendants: 1,
        minAttendants: 1
      }
    ]

    // Use Prisma createMany for proper database insertion
    const result = await prisma.event_positions.createMany({
      data: positions,
      skipDuplicates: true
    })

    // Now create position assignment for Paul Lewis to Station 22
    const paulLewisId = '17eee495-4a14-4825-8760-d5efac609783'
    
    // Get the Station 22 position we just created
    const station22 = await prisma.event_positions.findFirst({
      where: {
        eventId: eventId,
        positionNumber: 22
      }
    })

    if (station22) {
      // Create position assignment using Prisma
      await prisma.position_assignments.create({
        data: {
          eventId: eventId,
          positionId: station22.id,
          attendantId: paulLewisId,
          startTime: new Date('2025-11-02T07:50:00'),
          endTime: new Date('2025-11-02T10:00:00'),
          status: 'ASSIGNED',
          assignedAt: new Date()
        }
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        positionsCreated: result.count,
        assignmentCreated: station22 ? 1 : 0,
        positions: positions.map(p => ({ 
          number: p.positionNumber, 
          name: p.positionName 
        }))
      },
      message: 'Event positions and assignments created successfully using Prisma'
    })
  } catch (error) {
    console.error('Setup positions error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
