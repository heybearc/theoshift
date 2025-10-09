import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'

// APEX GUARDIAN: Individual Position Management API
// Handles GET, PUT, DELETE for specific positions

const positionUpdateSchema = z.object({
  name: z.string().min(1, 'Position name is required').optional(),
  description: z.string().optional(),
  area: z.string().optional(),
  sequence: z.number().optional(),
  isActive: z.boolean().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId, positionId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    if (!positionId || typeof positionId !== 'string') {
      return res.status(400).json({ success: false, error: 'Position ID is required' })
    }

    // Verify position exists and belongs to event
    const position = await prisma.positions.findFirst({
      where: {
        id: positionId,
        eventId
      },
      include: {
        shifts: {
          orderBy: { sequence: 'asc' }
        },
        assignments: {
          include: {
            attendant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            shift: true,
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
        }
      }
    })

    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetPosition(req, res, position)
      case 'PUT':
        return await handleUpdatePosition(req, res, position)
      case 'DELETE':
        return await handleDeletePosition(req, res, position)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Position API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetPosition(req: NextApiRequest, res: NextApiResponse, position: any) {
  try {
    return res.status(200).json({
      success: true,
      data: position
    })
  } catch (error) {
    console.error('Get position error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch position' })
  }
}

async function handleUpdatePosition(req: NextApiRequest, res: NextApiResponse, position: any) {
  try {
    const validatedData = positionUpdateSchema.parse(req.body)

    const updatedPosition = await prisma.positions.update({
      where: { id: position.id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        shifts: {
          orderBy: { sequence: 'asc' }
        },
        assignments: {
          include: {
            attendant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            shift: true
          }
        }
      }
    })

    return res.status(200).json({
      success: true,
      data: updatedPosition
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      })
    }

    console.error('Update position error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update position'
    })
  }
}

async function handleDeletePosition(req: NextApiRequest, res: NextApiResponse, position: any) {
  try {
    const session = await getServerSession(req, res, authOptions)
    const isHardDelete = req.query.hardDelete === 'true'
    
    // Hard delete requires admin role
    if (isHardDelete && session?.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Hard delete requires admin privileges'
      })
    }

    // Check dependencies for both soft and hard delete
    const assignmentCount = await prisma.position_assignments.count({
      where: { positionId: position.id }
    })

    const shiftCount = await prisma.position_shifts.count({
      where: { positionId: position.id }
    })

    if (isHardDelete) {
      // Hard delete: Check for ANY dependencies (active or inactive)
      if (assignmentCount > 0 || shiftCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot permanently delete position with ${assignmentCount} assignment(s) and ${shiftCount} shift(s). Remove all dependencies first.`,
          dependencies: {
            assignments: assignmentCount,
            shifts: shiftCount
          }
        })
      }

      // Perform hard delete
      await prisma.positions.delete({
        where: { id: position.id }
      })

      return res.status(200).json({
        success: true,
        message: 'Position permanently deleted successfully'
      })
    } else {
      // Soft delete: Only check active assignments
      const activeAssignmentCount = await prisma.position_assignments.count({
        where: { 
          positionId: position.id,
          attendant: {
            isActive: true
          }
        }
      })

      if (activeAssignmentCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot deactivate position with ${activeAssignmentCount} active assignment(s). Remove active assignments first.`
        })
      }

      // Soft delete by setting isActive to false
      await prisma.positions.update({
        where: { id: position.id },
        data: {
          isActive: false
        }
      })

      return res.status(200).json({
        success: true,
        message: 'Position deactivated successfully'
      })
    }
  } catch (error) {
    console.error('Delete position error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete position'
    })
  }
}
