import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../src/lib/prisma'
import { randomUUID } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  try {
    // Create test positions for the event
    const positions = [
      {
        id: randomUUID(),
        eventId: eventId,
        name: 'Station 22 - Inside Entrance Near Parking Lot - Morning 1',
        description: 'Inside entrance near parking lot',
        location: 'Near Parking Lot',
        department: 'ATTENDANT',
        isActive: true
      },
      {
        id: randomUUID(),
        eventId: eventId,
        name: 'Station 15 - Main Auditorium - Morning 2',
        description: 'Main auditorium oversight',
        location: 'Main Auditorium',
        department: 'ATTENDANT',
        isActive: true
      }
    ]

    // Insert positions
    for (const position of positions) {
      await prisma.$executeRaw`
        INSERT INTO event_positions (id, "eventId", name, description, location, department, "isActive", "createdAt", "updatedAt")
        VALUES (${position.id}, ${position.eventId}, ${position.name}, ${position.description}, ${position.location}, ${position.department}, ${position.isActive}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `
    }

    // Get Paul Lewis's attendant ID
    const paulLewis = await prisma.$queryRaw`
      SELECT id FROM attendants WHERE "firstName" = 'Paul' AND "lastName" = 'Lewis'
    ` as any[]

    if (paulLewis.length > 0) {
      const attendantId = paulLewis[0].id

      // Create position assignment for Paul Lewis
      await prisma.$executeRaw`
        INSERT INTO position_assignments (id, "eventId", "positionId", "attendantId", "startTime", "endTime", status, "assignedAt", "createdAt", "updatedAt")
        VALUES (
          ${randomUUID()}, 
          ${eventId}, 
          ${positions[0].id}, 
          ${attendantId}, 
          '07:50:00', 
          '10:00:00', 
          'ASSIGNED', 
          NOW(), 
          NOW(), 
          NOW()
        )
        ON CONFLICT DO NOTHING
      `
    }

    return res.status(200).json({
      success: true,
      data: {
        positionsCreated: positions.length,
        assignmentsCreated: paulLewis.length > 0 ? 1 : 0
      },
      message: 'Test positions and assignments created successfully'
    })
  } catch (error) {
    console.error('Create test positions error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
