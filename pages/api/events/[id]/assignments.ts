import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { handleApiError } from '@/lib/apiError'
import { canManageAssignments } from '../../../../src/lib/eventAccess'
import { shiftsConflict } from '../../../../lib/shiftConflict'
import { grantAllPublishedDocuments } from '@/lib/grantPublishedDocuments'

// Validation schema for assignment creation
const assignmentSchema = z.object({
  volunteerId: z.string().min(1, 'Volunteer ID is required'),
  positionId: z.string().min(1, 'Position ID is required'),
  role: z.enum(['VOLUNTEER', 'ATTENDANT', 'OVERSEER', 'KEYMAN']).optional().default('VOLUNTEER'),
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

    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const canManage = await canManageAssignments(user.id, eventId)
    if (!canManage) {
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
            volunteer: {
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
        const validatedData = assignmentSchema.parse(req.body)
        
        // SHIFT-SPECIFIC CONFLICT DETECTION
        
        // Get the shift details for time conflict checking
        const targetShift = await prisma.position_shifts.findUnique({
          where: { id: validatedData.shiftId },
          include: { positions: true }
        })
        
        if (!targetShift) {
          return res.status(404).json({ error: 'Shift not found' })
        }
        
        // Check if attendant is already assigned to this specific shift
        const existingShiftAssignment = await prisma.position_assignments.findFirst({
          where: {
            volunteerId: validatedData.volunteerId,
            shiftId: validatedData.shiftId
          }
        })
        
        if (existingShiftAssignment) {
          return res.status(409).json({ 
            error: 'Attendant is already assigned to this shift',
            conflictType: 'DUPLICATE_SHIFT_ASSIGNMENT'
          })
        }
        
        // Check for same-day conflicts (all-day and time overlap)
        const existingAssignments = await prisma.position_assignments.findMany({
          where: {
            volunteerId: validatedData.volunteerId,
            NOT: { shiftId: validatedData.shiftId },
            positions: {
              eventId: eventId
            }
          },
          include: {
            shift: true,
            positions: {
              select: { name: true }
            }
          }
        })
        
        const conflictingAssignments = existingAssignments.filter((assignment: any) => {
          const shift = assignment.shift
          if (!shift) return false
          return shiftsConflict(targetShift, shift)
        })
          
        if (conflictingAssignments.length > 0) {
          const conflicts = conflictingAssignments.map((assignment: any) => ({
            positionName: assignment.positions?.name || 'Unknown position',
            shiftName: assignment.shift?.name || 'Unknown shift',
            startTime: assignment.shift?.startTime,
            endTime: assignment.shift?.endTime,
            shiftDate: assignment.shift?.shiftDate
          }))

          const hasAllDay = targetShift.isAllDay || conflictingAssignments.some((a: any) => a.shift?.isAllDay)
            
          return res.status(409).json({
            error: hasAllDay
              ? 'Same-day all-day shift conflict'
              : 'Time conflict detected with existing assignments',
            conflictType: hasAllDay ? 'ALL_DAY_CONFLICT' : 'TIME_OVERLAP',
            conflicts: conflicts,
            message: hasAllDay
              ? 'Cannot assign overlapping same-day shifts when an all-day shift is involved'
              : `Attendant has conflicting assignments during this time period`
          })
        }
        
        // Check if shift already has someone in this specific role (only for OVERSEER/KEYMAN)
        // Multiple volunteers are allowed per shift
        if (validatedData.role === 'OVERSEER' || validatedData.role === 'KEYMAN') {
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
        }
        
        // Multiple volunteers per shift are now allowed
        // Only check for duplicate assignments (same volunteer on same shift)
        const duplicateAssignment = await prisma.position_assignments.findFirst({
          where: {
            shiftId: validatedData.shiftId,
            volunteerId: validatedData.volunteerId,
            role: validatedData.role
          }
        })
        
        if (duplicateAssignment) {
          return res.status(409).json({
            error: 'This volunteer is already assigned to this shift',
            conflictType: 'DUPLICATE_SHIFT_ASSIGNMENT',
            message: 'Cannot assign the same volunteer to the same shift twice'
          })
        }
        
        
        const newAssignment = await prisma.position_assignments.create({
          data: {
            id: crypto.randomUUID(),
            positionId: validatedData.positionId,
            volunteerId: validatedData.volunteerId,
            role: validatedData.role,
            shiftId: validatedData.shiftId,
            assignedAt: new Date(),
            assignedBy: session.user?.id || null
          }
        })

        try {
          await grantAllPublishedDocuments(eventId, validatedData.volunteerId)
        } catch (grantError) {
          console.error('Assignment saved, but published documents were not granted', grantError)
        }

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
    // Error logged by handleApiError
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
