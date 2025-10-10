import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for overseer assignment
const overseerSchema = z.object({
  overseerId: z.string().min(1, 'Overseer ID is required'),
  keymanId: z.string().optional(),
  responsibilities: z.string().optional(),
  positionId: z.string().min(1, 'Position ID is required')
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId, positionId } = req.query

    if (!eventId || typeof eventId !== 'string' || !positionId || typeof positionId !== 'string') {
      return res.status(400).json({ error: 'Event ID and Position ID are required' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user || !['ADMIN', 'OVERSEER', 'admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'POST':
        console.log('Overseer assignment request body:', req.body)
        console.log('Position ID received:', positionId)
        const validatedData = overseerSchema.parse(req.body)
        console.log('Validated overseer data:', validatedData)
        
        // Verify position exists in positions table
        const position = await prisma.positions.findUnique({
          where: { id: positionId }
        })
        
        console.log('Position lookup result:', position ? 'Found' : 'Not found')
        
        if (!position) {
          // Also check event_positions table for debugging
          const eventPosition = await prisma.event_positions.findUnique({
            where: { id: positionId }
          })
          console.log('Event position lookup result:', eventPosition ? 'Found' : 'Not found')
          return res.status(404).json({ error: 'Position not found' })
        }

        // Verify overseer exists in attendants table
        const overseer = await prisma.attendants.findUnique({
          where: { id: validatedData.overseerId }
        })

        console.log('Overseer lookup result:', overseer ? 'Found' : 'Not found')

        if (!overseer) {
          return res.status(404).json({ error: 'Overseer not found' })
        }

        // Verify keyman exists if provided
        if (validatedData.keymanId) {
          const keyman = await prisma.attendants.findUnique({
            where: { id: validatedData.keymanId }
          })
          
          console.log('Keyman lookup result:', keyman ? 'Found' : 'Not found')
          
          if (!keyman) {
            return res.status(404).json({ error: 'Keyman not found' })
          }
        }

        // Get or create an All Day shift for this position (required for assignments)
        let allDayShift = await prisma.position_shifts.findFirst({
          where: {
            positionId: positionId,
            name: 'All Day'
          }
        })

        if (!allDayShift) {
          console.log('All Day shift not found, creating one...')
          allDayShift = await prisma.position_shifts.create({
            data: {
              id: require('crypto').randomUUID(),
              positionId: positionId,
              name: 'All Day',
              startTime: null,
              endTime: null,
              isAllDay: true,
              sequence: 1
            }
          })
          console.log('✅ Created All Day shift:', allDayShift.id)
        }

        // Create overseer assignment in position_assignments table
        console.log('Creating overseer assignment with data:', {
          positionId,
          attendantId: validatedData.overseerId,
          role: 'OVERSEER',
          overseerId: validatedData.overseerId,
          shiftId: allDayShift.id,
          assignedBy: user.id
        })

        const overseerAssignment = await prisma.position_assignments.create({
          data: {
            id: crypto.randomUUID(),
            positionId: positionId,
            attendantId: validatedData.overseerId, // The overseer is also an attendant
            shiftId: allDayShift.id,
            role: 'OVERSEER',
            overseerId: validatedData.overseerId,
            assignedAt: new Date(),
            assignedBy: user.id // Use the user ID from the database lookup
          }
        })

        console.log('Successfully created overseer assignment:', overseerAssignment.id)

        // Create separate keyman assignment if keyman is provided
        let keymanAssignment: any = null
        if (validatedData.keymanId) {
          console.log('Creating keyman assignment with data:', {
            positionId,
            attendantId: validatedData.keymanId,
            role: 'KEYMAN',
            keymanId: validatedData.keymanId,
            shiftId: allDayShift.id,
            assignedBy: user.id
          })

          keymanAssignment = await prisma.position_assignments.create({
            data: {
              id: crypto.randomUUID(),
              positionId: positionId,
              attendantId: validatedData.keymanId, // The keyman is also an attendant
              shiftId: allDayShift.id,
              role: 'KEYMAN',
              keymanId: validatedData.keymanId,
              assignedAt: new Date(),
              assignedBy: user.id
            }
          })

          console.log('Successfully created keyman assignment:', keymanAssignment?.id)
        }

        return res.status(201).json({
          success: true,
          data: {
            overseerAssignment,
            keymanAssignment
          },
          message: keymanAssignment ? 
            'Overseer and keyman assigned successfully' : 
            'Overseer assigned successfully'
        })

      default:
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Overseer assignment API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
