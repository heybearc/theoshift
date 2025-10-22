import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../../src/lib/prisma'

// APEX GUARDIAN: Individual Shift Management API
// Handles deletion of individual shifts with proper cleanup

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 SHIFT MANAGEMENT API CALLED')
  try {
    console.log('1. Checking session...')
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ No session found')
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    console.log('✅ Session valid for user:', session.user.id)

    const { id: eventId, positionId, shiftId } = req.query
    console.log('2. Event ID:', eventId, 'Position ID:', positionId, 'Shift ID:', shiftId)

    if (!eventId || typeof eventId !== 'string' || 
        !positionId || typeof positionId !== 'string' ||
        !shiftId || typeof shiftId !== 'string') {
      console.log('❌ Invalid parameters')
      return res.status(400).json({ success: false, error: 'Event ID, Position ID, and Shift ID are required' })
    }

    // Verify event exists
    console.log('3. Verifying event exists...')
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      console.log('❌ Event not found')
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    // Verify position exists and belongs to event
    console.log('4. Verifying position exists...')
    const position = await prisma.positions.findFirst({
      where: { 
        id: positionId,
        eventId: eventId
      }
    })

    if (!position) {
      console.log('❌ Position not found or does not belong to event')
      return res.status(404).json({ success: false, error: 'Position not found' })
    }

    // Verify shift exists and belongs to position
    console.log('5. Verifying shift exists...')
    const shift = await prisma.position_shifts.findFirst({
      where: { 
        id: shiftId,
        positionId: positionId
      }
    })

    if (!shift) {
      console.log('❌ Shift not found or does not belong to position')
      return res.status(404).json({ success: false, error: 'Shift not found' })
    }

    if (req.method === 'DELETE') {
      return await handleDeleteShift(req, res, eventId, positionId, shiftId, shift.name)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('❌ SHIFT MANAGEMENT API ERROR:', error.message)
    console.error('Stack:', error.stack)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleDeleteShift(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string, shiftId: string, shiftName: string) {
  console.log('🗑️  Deleting shift...')
  
  try {
    // Check if shift has assignments
    const assignments = await prisma.position_assignments.findMany({
      where: { shiftId: shiftId }
    })

    console.log(`Found ${assignments.length} assignments for this shift`)

    // Delete in transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // First, delete all assignments for this shift
      if (assignments.length > 0) {
        await tx.position_assignments.deleteMany({
          where: { shiftId: shiftId }
        })
        console.log(`✅ Deleted ${assignments.length} assignments`)
      }

      // Then delete the shift itself
      await tx.position_shifts.delete({
        where: { id: shiftId }
      })
      console.log('✅ Deleted shift')
    })

    console.log('✅ Shift deleted successfully')
    return res.status(200).json({
      success: true,
      message: `Shift "${shiftName}" deleted successfully`,
      data: {
        shiftId: shiftId,
        assignmentsRemoved: assignments.length
      }
    })

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Shift not found'
      })
    }
    
    console.error('Delete shift error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete shift' 
    })
  }
}
