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
    
    if (!session?.user?.id) {
      console.log('❌ No session found')
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    console.log('✅ Session valid for user:', session.user.id)

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
      return await handleSetOversight(req, res, eventId, positionId, session.user.id)
    } else if (req.method === 'DELETE') {
      return await handleDeleteOversight(req, res, eventId, positionId)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('❌ POSITION OVERSIGHT API ERROR:', error.message)
    console.error('Stack:', error.stack)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetOversight(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string) {
  console.log('📖 Getting position oversight...')
  
  const oversight = await prisma.position_oversight_assignments.findUnique({
    where: {
      positionId_eventId: {
        positionId: positionId,
        eventId: eventId
      }
    },
    include: {
      overseer: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      keyman: {
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

    // Upsert oversight assignment
    const oversight = await prisma.position_oversight_assignments.upsert({
      where: {
        positionId_eventId: {
          positionId: positionId,
          eventId: eventId
        }
      },
      update: {
        overseerId: validatedData.overseerId || null,
        keymanId: validatedData.keymanId || null,
        assignedBy: userId,
        updatedAt: new Date()
      },
      create: {
        positionId: positionId,
        eventId: eventId,
        overseerId: validatedData.overseerId || null,
        keymanId: validatedData.keymanId || null,
        assignedBy: userId
      },
      include: {
        overseer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        keyman: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    console.log('✅ Position oversight assigned successfully')
    return res.status(200).json({
      success: true,
      data: oversight,
      message: 'Position oversight assigned successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: error.errors[0].message 
      })
    }
    
    console.error('Set oversight error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to assign oversight' 
    })
  }
}

async function handleDeleteOversight(req: NextApiRequest, res: NextApiResponse, eventId: string, positionId: string) {
  console.log('🗑️  Deleting position oversight...')
  
  try {
    await prisma.position_oversight_assignments.delete({
      where: {
        positionId_eventId: {
          positionId: positionId,
          eventId: eventId
        }
      }
    })

    console.log('✅ Position oversight deleted successfully')
    return res.status(200).json({
      success: true,
      message: 'Position oversight removed successfully'
    })

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'No oversight assignment found for this position'
      })
    }
    
    console.error('Delete oversight error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to remove oversight' 
    })
  }
}
