import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for applying shift templates
const applyTemplateSchema = z.object({
  positionIds: z.array(z.string().min(1)),
  templateType: z.enum(['standard', 'extended', 'allday', 'custom']),
  customShifts: z.array(z.object({
    name: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    isAllDay: z.boolean().default(false)
  })).optional()
})

// Shift templates matching your requirements
const SHIFT_TEMPLATES = {
  'standard': [
    { name: 'Morning 1', startTime: '07:50', endTime: '10:00', isAllDay: false },
    { name: 'Morning 2', startTime: '10:00', endTime: '12:00', isAllDay: false },
    { name: 'Afternoon 1', startTime: '12:00', endTime: '14:00', isAllDay: false },
    { name: 'Afternoon 2', startTime: '14:00', endTime: '17:00', isAllDay: false }
  ],
  'extended': [
    { name: 'Early Morning', startTime: '06:30', endTime: '08:30', isAllDay: false },
    { name: 'Morning', startTime: '08:30', endTime: '10:30', isAllDay: false },
    { name: 'Late Morning', startTime: '10:30', endTime: '12:45', isAllDay: false },
    { name: 'Early Afternoon', startTime: '12:45', endTime: '15:00', isAllDay: false },
    { name: 'Late Afternoon', startTime: '15:00', endTime: '21:00', isAllDay: false }
  ],
  'allday': [
    { name: 'All Day', startTime: '', endTime: '', isAllDay: true }
  ]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID is required' })
    }

    switch (req.method) {
      case 'POST':
        console.log('Apply shift template request:', req.body)
        const validatedData = applyTemplateSchema.parse(req.body)
        
        // Get the shift template
        let shiftsToCreate = validatedData.templateType === 'custom' 
          ? validatedData.customShifts || []
          : SHIFT_TEMPLATES[validatedData.templateType]
        
        if (shiftsToCreate.length === 0) {
          return res.status(400).json({ error: 'No shifts defined in template' })
        }
        
        // Verify all positions exist and belong to this event
        const positions = await prisma.positions.findMany({
          where: {
            id: { in: validatedData.positionIds },
            eventId: eventId
          }
        })
        
        if (positions.length !== validatedData.positionIds.length) {
          return res.status(404).json({ error: 'One or more positions not found' })
        }
        
        let totalShiftsCreated = 0
        const results: any[] = []
        
        // Apply template to each position
        for (const position of positions) {
          console.log(`Applying ${validatedData.templateType} template to position ${position.name}`)
          
          // Check if position already has shifts
          const existingShifts = await prisma.position_shifts.findMany({
            where: { positionId: position.id }
          })

          const hasAllDayShift = existingShifts.some(s => s.isAllDay)
          const isCreatingAllDay = shiftsToCreate.some(s => s.isAllDay)

          // Skip this position if it already has an All Day shift
          if (hasAllDayShift) {
            console.log(`Skipping position ${position.name} - already has All Day shift`)
            results.push({
              positionId: position.id,
              positionName: position.name,
              shiftsCreated: 0,
              skipped: true,
              reason: 'Position already has an All Day shift'
            })
            continue
          }

          // Skip if trying to create All Day shift but position already has other shifts
          if (isCreatingAllDay && existingShifts.length > 0) {
            console.log(`Skipping position ${position.name} - cannot create All Day shift when other shifts exist`)
            results.push({
              positionId: position.id,
              positionName: position.name,
              shiftsCreated: 0,
              skipped: true,
              reason: 'Cannot create All Day shift - position already has other shifts'
            })
            continue
          }
          
          const positionShifts: any[] = []
          
          // Create shifts for this position
          for (let i = 0; i < shiftsToCreate.length; i++) {
            const shiftTemplate = shiftsToCreate[i]
            
            const shiftData = {
              id: crypto.randomUUID(),
              positionId: position.id,
              name: shiftTemplate.name,
              startTime: shiftTemplate.isAllDay ? null : shiftTemplate.startTime,
              endTime: shiftTemplate.isAllDay ? null : shiftTemplate.endTime,
              isAllDay: shiftTemplate.isAllDay,
              sequence: existingShifts.length + i + 1
            }
            
            const newShift = await prisma.position_shifts.create({
              data: shiftData
            })
            
            positionShifts.push(newShift)
            totalShiftsCreated++
          }
          
          results.push({
            positionId: position.id,
            positionName: position.name,
            shiftsCreated: positionShifts.length,
            shifts: positionShifts
          })
        }
        
        console.log(`Successfully created ${totalShiftsCreated} shifts across ${positions.length} positions`)
        
        return res.status(201).json({
          success: true,
          data: {
            templateType: validatedData.templateType,
            positionsProcessed: positions.length,
            totalShiftsCreated: totalShiftsCreated,
            results: results
          },
          message: `Successfully applied ${validatedData.templateType} template to ${positions.length} position(s)`
        })

      default:
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Apply shift template API error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      })
    }
    
    return res.status(500).json({ error: 'Internal server error' })
  }
}
