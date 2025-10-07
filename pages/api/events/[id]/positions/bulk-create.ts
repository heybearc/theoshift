import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// APEX GUARDIAN: Bulk Position Creation API
// Creates numbered positions with optional shift templates

const bulkCreateSchema = z.object({
  startNumber: z.number().min(1).max(1000),
  endNumber: z.number().min(1).max(1000),
  namePrefix: z.string().default('Position'), // "Position", "Station", etc.
  area: z.string().optional(), // Optional grouping
  shiftTemplateId: z.string().optional(), // Use predefined shift template
  customShifts: z.array(z.object({
    name: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    isAllDay: z.boolean().default(false)
  })).optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    if (req.method === 'POST') {
      return await handleBulkCreate(req, res, eventId)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Bulk create positions error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleBulkCreate(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  try {
    const validatedData = bulkCreateSchema.parse(req.body)
    
    if (validatedData.endNumber < validatedData.startNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'End number must be greater than or equal to start number' 
      })
    }

    const positionCount = validatedData.endNumber - validatedData.startNumber + 1
    
    if (positionCount > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot create more than 100 positions at once' 
      })
    }

    // Check for existing positions in this range
    const existingPositions = await prisma.positions.findMany({
      where: {
        eventId,
        positionNumber: {
          gte: validatedData.startNumber,
          lte: validatedData.endNumber
        }
      },
      select: { positionNumber: true }
    })

    if (existingPositions.length > 0) {
      const existingNumbers = existingPositions.map(p => p.positionNumber).sort()
      return res.status(400).json({
        success: false,
        error: `Positions already exist: ${existingNumbers.join(', ')}`
      })
    }

    // Get shift template if specified
    let shiftsToCreate = validatedData.customShifts || []
    
    if (validatedData.shiftTemplateId && !validatedData.customShifts) {
      const template = await prisma.shiftTemplates.findUnique({
        where: { id: validatedData.shiftTemplateId }
      })
      
      if (template) {
        shiftsToCreate = template.shifts as any[]
      }
    }

    // Create positions in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdPositions = []
      
      for (let num = validatedData.startNumber; num <= validatedData.endNumber; num++) {
        const position = await tx.positions.create({
          data: {
            id: randomUUID(),
            eventId,
            positionNumber: num,
            name: `${validatedData.namePrefix} ${num}`,
            area: validatedData.area,
            sequence: num
          }
        })
        
        // Create shifts for this position
        if (shiftsToCreate.length > 0) {
          for (let i = 0; i < shiftsToCreate.length; i++) {
            const shift = shiftsToCreate[i]
            await tx.position_shifts.create({
              data: {
                id: randomUUID(),
                positionId: position.id,
                name: shift.name,
                startTime: shift.startTime || null,
                endTime: shift.endTime || null,
                isAllDay: shift.isAllDay || false,
                sequence: i + 1
              }
            })
          }
        }
        
        createdPositions.push(position)
      }
      
      return createdPositions
    })

    return res.status(201).json({
      success: true,
      data: {
        created: result.length,
        positions: result,
        message: `Successfully created ${result.length} positions (${validatedData.startNumber}-${validatedData.endNumber})`
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: error.errors[0].message 
      })
    }
    
    console.error('Bulk create error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create positions' 
    })
  }
}
