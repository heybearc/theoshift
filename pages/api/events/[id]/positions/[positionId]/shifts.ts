import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for shift creation
const shiftSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isAllDay: z.boolean().default(false),
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
        console.log('Shift creation request body:', req.body)
        const validatedData = shiftSchema.parse(req.body)
        console.log('Validated shift data:', validatedData)
        
        // Verify position exists
        const position = await prisma.positions.findUnique({
          where: { id: positionId }
        })

        if (!position) {
          return res.status(404).json({ error: 'Position not found' })
        }

        // Get the next sequence number for this position
        const existingShifts = await prisma.position_shifts.count({
          where: { positionId: positionId }
        })

        const newShift = await prisma.position_shifts.create({
          data: {
            id: crypto.randomUUID(),
            positionId: positionId,
            name: validatedData.isAllDay ? 'All Day' : `Shift ${existingShifts + 1}`,
            startTime: validatedData.isAllDay ? null : validatedData.startTime,
            endTime: validatedData.isAllDay ? null : validatedData.endTime,
            isAllDay: validatedData.isAllDay,
            sequence: existingShifts + 1
          }
        })

        return res.status(201).json({
          success: true,
          data: newShift,
          message: 'Shift created successfully'
        })

      case 'DELETE':
        const { shiftId } = req.body
        
        if (!shiftId) {
          return res.status(400).json({ error: 'Shift ID is required' })
        }

        // Verify shift exists and belongs to this position
        const shift = await prisma.position_shifts.findUnique({
          where: { id: shiftId }
        })

        if (!shift) {
          return res.status(404).json({ error: 'Shift not found' })
        }

        if (shift.positionId !== positionId) {
          return res.status(400).json({ error: 'Shift does not belong to this position' })
        }

        // Check if shift has any assignments and remove them first
        const assignments = await prisma.position_assignments.findMany({
          where: { shiftId: shiftId }
        })

        console.log(`🗑️ Deleting shift ${shiftId} with ${assignments.length} assignments`)

        if (assignments.length > 0) {
          console.log(`📋 Removing ${assignments.length} attendant assignments from shift`)
          // Delete all assignments for this shift first
          await prisma.position_assignments.deleteMany({
            where: { shiftId: shiftId }
          })
          console.log(`✅ Removed ${assignments.length} assignments`)
        }

        // Delete the shift
        await prisma.position_shifts.delete({
          where: { id: shiftId }
        })

        console.log(`✅ Successfully deleted shift ${shiftId}`)

        return res.status(200).json({
          success: true,
          message: assignments.length > 0 
            ? `Shift deleted successfully (${assignments.length} attendant assignments removed)`
            : 'Shift deleted successfully'
        })

      default:
        res.setHeader('Allow', ['POST', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Shift creation API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
