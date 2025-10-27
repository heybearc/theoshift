import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for assignment creation
const assignmentSchema = z.object({
  attendantId: z.string().min(1, 'Attendant ID is required'),
  positionId: z.string().min(1, 'Position ID is required'),
  role: z.enum(['ATTENDANT', 'OVERSEER', 'KEYMAN']).optional().default('ATTENDANT'),
  shiftId: z.string().min(1, 'Shift ID is required for all assignments'),
  notes: z.string().optional()
})

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

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user || !['ADMIN', 'OVERSEER', 'admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        const assignments = await prisma.position_assignments.findMany({
          where: { 
            positions: { 
              eventId: eventId 
            } 
          },
          include: {
            attendant: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            positions: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { assignedAt: 'desc' }
        })

        return res.status(200).json({
          success: true,
          data: assignments,
          total: assignments.length
        })

      case 'POST':
        console.log('Assignment creation request body:', req.body)
        const validatedData = assignmentSchema.parse(req.body)
        console.log('Validated assignment data:', validatedData)
        
        // SHIFT-SPECIFIC CONFLICT DETECTION
        console.log('🔍 Checking for shift conflicts...')
        
        // Get the shift details for time conflict checking
        const targetShift = await (prisma as any).position_shifts.findUnique({
          where: { id: validatedData.shiftId },
          include: { positions: true }
        })
        
        if (!targetShift) {
          return res.status(404).json({ error: 'Shift not found' })
        }
        
        // Check if attendant is already assigned to this specific shift
        const existingShiftAssignment = await prisma.position_assignments.findFirst({
          where: {
            attendantId: validatedData.attendantId,
            shiftId: validatedData.shiftId
          }
        })
        
        if (existingShiftAssignment) {
          return res.status(409).json({ 
            error: 'Attendant is already assigned to this shift',
            conflictType: 'DUPLICATE_SHIFT_ASSIGNMENT'
          })
        }
        
        // Check for all-day shift conflicts
        // If attendant has an all-day shift, they can't take any other shift
        // If assigning an all-day shift, attendant can't have any existing shifts
        const existingAssignments = await (prisma as any).position_assignments.findMany({
          where: {
            attendantId: validatedData.attendantId,
            NOT: { shiftId: validatedData.shiftId }
          },
          include: {
            shift: true
          }
        })
        
        // Check if attendant already has an all-day shift
        const hasAllDayShift = existingAssignments.some((a: any) => a.shift?.isAllDay)
        if (hasAllDayShift) {
          return res.status(409).json({
            error: 'Attendant already has an all-day shift',
            conflictType: 'ALL_DAY_CONFLICT',
            message: 'Cannot assign additional shifts to attendant with all-day shift'
          })
        }
        
        // Check if assigning an all-day shift to attendant with existing shifts
        if (targetShift.isAllDay && existingAssignments.length > 0) {
          return res.status(409).json({
            error: 'Cannot assign all-day shift to attendant with existing shifts',
            conflictType: 'ALL_DAY_CONFLICT',
            message: 'Attendant must have no other shifts to receive all-day shift'
          })
        }
        
        // Check for time conflicts with other shifts (if not all-day)
        if (!targetShift.isAllDay && targetShift.startTime && targetShift.endTime) {
          const conflictingAssignments = existingAssignments.filter((assignment: any) => {
            const shift = assignment.shift
            if (!shift || shift.isAllDay) return false
            
            // Check for time overlap
            return shift.endTime > targetShift.startTime && shift.startTime < targetShift.endTime
          })
          
          if (conflictingAssignments.length > 0) {
            const conflicts = conflictingAssignments.map((assignment: any) => ({
              positionName: assignment.positions?.name || assignment.shift?.positions?.name,
              shiftName: assignment.shift?.name,
              startTime: assignment.shift?.startTime,
              endTime: assignment.shift?.endTime
            }))
            
            return res.status(409).json({
              error: 'Time conflict detected with existing assignments',
              conflictType: 'TIME_OVERLAP',
              conflicts: conflicts,
              message: `Attendant has conflicting assignments during this time period`
            })
          }
        }
        
        // Check if shift already has someone in this specific role
        const existingRoleAssignment = await prisma.position_assignments.findFirst({
          where: { 
            shiftId: validatedData.shiftId,
            role: validatedData.role
          }
        })
        
        if (existingRoleAssignment) {
          return res.status(409).json({
            error: `Shift already has a ${validatedData.role.toLowerCase()} assigned`,
            conflictType: 'ROLE_OCCUPIED',
            message: `Each shift can only have one ${validatedData.role.toLowerCase()}`
          })
        }
        
        // For regular attendants, limit to 1 per shift
        if (validatedData.role === 'ATTENDANT') {
          const existingAttendants = await prisma.position_assignments.count({
            where: { 
              shiftId: validatedData.shiftId,
              role: 'ATTENDANT'
            }
          })
          
          if (existingAttendants >= 1) {
            return res.status(409).json({
              error: 'Shift already has maximum attendants assigned',
              conflictType: 'SHIFT_FULL',
              message: 'Each shift can only have one attendant assigned'
            })
          }
        }
        
        console.log('✅ No conflicts detected, creating assignment...')
        
        const newAssignment = await prisma.position_assignments.create({
          data: {
            id: crypto.randomUUID(),
            positionId: validatedData.positionId,
            attendantId: validatedData.attendantId,
            role: validatedData.role,
            shiftId: validatedData.shiftId,
            assignedAt: new Date(),
            assignedBy: session.user?.id || null
          }
        })

        return res.status(201).json({
          success: true,
          data: newAssignment,
          message: 'Assignment created successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    const fs = require('fs')
    const errorMsg = `\n❌ ASSIGNMENT API ERROR at ${new Date().toISOString()}\nMessage: ${error.message}\nStack: ${error.stack}\n`
    fs.appendFileSync('/tmp/assignment-error.log', errorMsg)
    console.error('Assignment API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
