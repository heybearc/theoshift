import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'

// APEX GUARDIAN: Position Oversight Assignment API
// Shift-independent oversight for positions
// Supports smart assignment algorithm with oversight mapping

const positionOversightSchema = z.object({
  overseerId: z.string().optional(),
  keymanId: z.string().optional()
}).refine(data => data.overseerId || data.keymanId, {
  message: "At least one of overseerId or keymanId must be provided"
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 POSITION OVERSIGHT API CALLED')
  try {
    console.log('1. Checking session...')
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      console.log('❌ No session found')
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    console.log('✅ Session valid for user:', session.user?.email)

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user) {
      console.log('❌ User not found')
      return res.status(401).json({ success: false, error: 'User not found' })
    }

    const { id: eventId, positionId } = req.query
    console.log('2. Event ID:', eventId, 'Position ID:', positionId)

    if (!eventId || typeof eventId !== 'string' || !positionId || typeof positionId !== 'string') {
      console.log('❌ Invalid parameters')
      return res.status(400).json({ success: false, error: 'Event ID and Position ID are required' })
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

    if (req.method === 'GET') {
      return await handleGetOversight(req, res, eventId, positionId)
    } else if (req.method === 'POST' || req.method === 'PUT') {
      return await handleSetOversight(req, res, eventId, positionId, user.id)
    } else if (req.method === 'DELETE') {
      return await handleDeleteOversight(req, res, eventId, positionId)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: any) {
    const fs = require('fs')
    const errorMsg = `\n❌ POSITION OVERSIGHT API ERROR at ${new Date().toISOString()}\nMessage: ${error.message}\nStack: ${error.stack}\n`
    fs.appendFileSync('/tmp/position-oversight-error.log', errorMsg)
    console.error('❌ POSITION OVERSIGHT API ERROR:', error.message)
    console.error('Stack:', error.stack)
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message })
  }
}

async function handleGetOversight(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string) {
  console.log('📖 Getting position oversight...')
  
  const oversight = await (prisma as any).position_oversight_assignments.findFirst({
    where: {
      position_id: positionId,
      event_id: eventId
    },
    include: {
      attendants_position_oversight_assignments_overseer_idToattendants: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      attendants_position_oversight_assignments_keyman_idToattendants: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: oversight
  })
}

async function handleSetOversight(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string, userId: string) {
  console.log('📝 Setting position oversight...')
  
  try {
    const validatedData = positionOversightSchema.parse(req.body)
    console.log('✅ Validated data:', validatedData)

    // Verify overseer exists if provided
    if (validatedData.overseerId) {
      const overseer = await prisma.attendants.findUnique({
        where: { id: validatedData.overseerId }
      })
      
      if (!overseer) {
        return res.status(404).json({ success: false, error: 'Overseer not found' })
      }
    }

    // Verify keyman exists if provided
    if (validatedData.keymanId) {
      const keyman = await prisma.attendants.findUnique({
        where: { id: validatedData.keymanId }
      })
      
      if (!keyman) {
        return res.status(404).json({ success: false, error: 'Keyman not found' })
      }
    }

    // Check if oversight exists
    const existing = await (prisma as any).position_oversight_assignments.findFirst({
      where: {
        position_id: positionId,
        event_id: eventId
      }
    })

    let oversight
    if (existing) {
      oversight = await (prisma as any).position_oversight_assignments.update({
        where: { id: existing.id },
        data: {
          overseer_id: validatedData.overseerId || null,
          keyman_id: validatedData.keymanId || null,
          assigned_by: userId,
          updated_at: new Date()
        }
      })
    } else {
      oversight = await (prisma as any).position_oversight_assignments.create({
        data: {
          position_id: positionId,
          event_id: eventId,
          overseer_id: validatedData.overseerId || null,
          keyman_id: validatedData.keymanId || null,
          assigned_by: userId
        }
      })
    }

    console.log('✅ Position oversight assigned successfully')
    return res.status(200).json({
      success: true,
      data: oversight,
      message: 'Position oversight assigned successfully'
    })

  } catch (error: any) {
    const fs = require('fs')
    const errorMsg = `\n❌ SET OVERSIGHT ERROR at ${new Date().toISOString()}\nMessage: ${error.message}\nStack: ${error.stack}\n`
    fs.appendFileSync('/tmp/position-oversight-error.log', errorMsg)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: error.errors[0].message 
      })
    }
    
    console.error('Set oversight error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to assign oversight',
      details: error.message
    })
  }
}

async function handleDeleteOversight(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string) {
  console.log('🗑️  Deleting position oversight...')
  
  try {
    const existing = await (prisma as any).position_oversight_assignments.findFirst({
      where: {
        position_id: positionId,
        event_id: eventId
      }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'No oversight assignment found for this position'
      })
    }

    await (prisma as any).position_oversight_assignments.delete({
      where: { id: existing.id }
    })

    console.log('✅ Position oversight deleted successfully')
    return res.status(200).json({
      success: true,
      message: 'Position oversight removed successfully'
    })

  } catch (error: any) {
    console.error('Delete oversight error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to remove oversight' 
    })
  }
}
