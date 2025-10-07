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
  console.log('🔍 BULK CREATE API CALLED')
  try {
    console.log('1. Checking session...')
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      console.log('❌ No session found')
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    console.log('✅ Session valid')

    const { id: eventId } = req.query
    console.log('2. Event ID:', eventId)

    if (!eventId || typeof eventId !== 'string') {
      console.log('❌ Invalid event ID')
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    console.log('3. Verifying event exists...')
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      console.log('❌ Event not found')
      return res.status(404).json({ success: false, error: 'Event not found' })
    }
    console.log('✅ Event found:', event.name)

    if (req.method === 'POST') {
      console.log('4. Calling handleBulkCreate...')
      return await handleBulkCreate(req, res, eventId)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('❌ BULK CREATE API ERROR:', error.message)
    console.error('Stack:', error.stack)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleBulkCreate(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  console.log('📝 handleBulkCreate started')
  try {
    console.log('5. Parsing request body...')
    const validatedData = bulkCreateSchema.parse(req.body)
    console.log('✅ Validated data:', validatedData)
    
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
      const template = await prisma.shift_templates.findUnique({
        where: { id: validatedData.shiftTemplateId }
      })
      
      if (template) {
        shiftsToCreate = template.shifts as any[]
      }
    }

    // Create positions in transaction
    console.log('6. Starting transaction...')
    const result = await prisma.$transaction(async (tx) => {
      const createdPositions = []
      console.log(`7. Creating ${validatedData.endNumber - validatedData.startNumber + 1} positions...`)
      
      for (let num = validatedData.startNumber; num <= validatedData.endNumber; num++) {
        console.log(`   Creating position ${num}...`)
        const position = await tx.positions.create({
          data: {
            id: randomUUID(),
            eventId,
            positionNumber: num,
            name: `${validatedData.namePrefix} ${num}`,
            area: validatedData.area,
            sequence: num,
            updatedAt: new Date()
          }
        })
        console.log(`   ✅ Position ${num} created`)
        
        // Create shifts for this position
        if (shiftsToCreate.length > 0) {
          console.log(`   Creating ${shiftsToCreate.length} shifts for position ${num}...`)
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
          console.log(`   ✅ Shifts created for position ${num}`)
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
