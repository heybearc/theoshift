import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'

// APEX GUARDIAN: Bulk Position Oversight Assignment API
// Shift-independent bulk oversight for multiple positions
// Supports efficient bulk operations for oversight management

const bulkOversightSchema = z.object({
  positionIds: z.array(z.string()).min(1, "At least one position ID is required"),
  overseerId: z.string().optional(),
  keymanId: z.string().optional()
}).refine(data => data.overseerId || data.keymanId, {
  message: "At least one of overseerId or keymanId must be provided"
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 BULK POSITION OVERSIGHT API CALLED')
  try {
    console.log('1. Checking session...')
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ No session found')
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    console.log('✅ Session valid for user:', session.user.id)

    const { id: eventId } = req.query
    console.log('2. Event ID:', eventId)

    if (!eventId || typeof eventId !== 'string') {
      console.log('❌ Invalid event ID')
      return res.status(400).json({ success: false, error: 'Event ID is required' })
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

    if (req.method === 'POST') {
      return await handleBulkOversightAssignment(req, res, eventId, session.user.id)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('❌ BULK OVERSIGHT API ERROR:', error.message)
    console.error('Stack:', error.stack)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleBulkOversightAssignment(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  console.log('📝 Handling bulk oversight assignment...')
  
  try {
    const validatedData = bulkOversightSchema.parse(req.body)
    console.log('✅ Validated data:', validatedData)

    // Verify all positions exist and belong to the event
    console.log('4. Verifying positions exist...')
    const positions = await prisma.positions.findMany({
      where: {
        id: { in: validatedData.positionIds },
        eventId: eventId
      },
      select: { id: true, name: true, positionNumber: true }
    })

    if (positions.length !== validatedData.positionIds.length) {
      const foundIds = positions.map(p => p.id)
      const missingIds = validatedData.positionIds.filter(id => !foundIds.includes(id))
      return res.status(400).json({
        success: false,
        error: `Some positions not found or don't belong to this event: ${missingIds.join(', ')}`
      })
    }

    // Verify overseer exists if provided
    if (validatedData.overseerId) {
      console.log('5. Verifying overseer exists...')
      const overseer = await prisma.attendants.findUnique({
        where: { id: validatedData.overseerId }
      })
      
      if (!overseer) {
        return res.status(404).json({ success: false, error: 'Overseer not found' })
      }
    }

    // Verify keyman exists if provided
    if (validatedData.keymanId) {
      console.log('6. Verifying keyman exists...')
      const keyman = await prisma.attendants.findUnique({
        where: { id: validatedData.keymanId }
      })
      
      if (!keyman) {
        return res.status(404).json({ success: false, error: 'Keyman not found' })
      }
    }

    // Perform bulk upsert in transaction
    console.log('7. Performing bulk oversight assignment...')
    const results = await prisma.$transaction(async (tx) => {
      const assignments = []
      
      for (const positionId of validatedData.positionIds) {
        const assignment = await tx.position_oversight_assignments.upsert({
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
            position: {
              select: { name: true, positionNumber: true }
            },
            overseer: {
              select: { id: true, firstName: true, lastName: true }
            },
            keyman: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        })
        
        assignments.push(assignment)
      }
      
      return assignments
    })

    console.log('✅ Bulk oversight assignment completed successfully')
    return res.status(200).json({
      success: true,
      data: {
        assignments: results,
        summary: {
          positionsProcessed: results.length,
          overseerId: validatedData.overseerId,
          keymanId: validatedData.keymanId
        }
      },
      message: `Successfully assigned oversight to ${results.length} positions`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: error.errors[0].message 
      })
    }
    
    console.error('Bulk oversight assignment error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to assign bulk oversight' 
    })
  }
}
