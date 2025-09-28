import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for lanyard updates
const updateLanyardSchema = z.object({
  lanyardNumber: z.string().min(1, 'Lanyard number is required').max(50).optional(),
  type: z.enum(['ATTENDANT', 'OVERSEER', 'KEYMAN', 'SECURITY', 'MEDICAL', 'SPECIAL']).optional(),
  color: z.string().min(1, 'Color is required').max(50).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// Validation schema for lanyard return
const returnLanyardSchema = z.object({
  returnedAt: z.string().optional(),
  returnNotes: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, lanyardId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (!lanyardId || typeof lanyardId !== 'string') {
    return res.status(400).json({ error: 'Lanyard ID is required' })
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user has admin or overseer role
  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { id: true, role: true }
  })

  if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId, lanyardId)
      case 'PUT':
        return await handlePut(req, res, eventId, lanyardId, user.id)
      case 'POST':
        return await handlePost(req, res, eventId, lanyardId, user.id)
      case 'DELETE':
        return await handleDelete(req, res, eventId, lanyardId, user.role)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Lanyard API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, lanyardId: string) {
  const lanyard = await prisma.lanyards.findUnique({
          }
      }
    }
  })

  if (!lanyard || lanyard.eventId !== eventId) {
    return res.status(404).json({ error: 'Lanyard not found' })
  }

  // Get current assignment (if any)
  const currentAssignment = lanyard.lanyard_assignments.find(assignment => !assignment.returnedAt)

  return res.status(200).json({
    success: true,
    data: {
      lanyard,
      currentAssignment,
      assignmentHistory: lanyard.lanyard_assignments
    }
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, lanyardId: string, userId: string) {
  // Check if lanyard exists
  const existingLanyard = await prisma.lanyards.findUnique({
    where: { id: lanyardId }
  })

  if (!existingLanyard || existingLanyard.eventId !== eventId) {
    return res.status(404).json({ error: 'Lanyard not found' })
  }

  // Validate request body
  const validation = updateLanyardSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Check if lanyard number is being changed and if it conflicts
  if (data.lanyardNumber && data.lanyardNumber !== existingLanyard.lanyardNumber) {
    const conflictingLanyard = await prisma.lanyards.findUnique({
      where: {
        eventId_lanyardNumber: {
          eventId: eventId,
          lanyardNumber: data.lanyardNumber
        }
      }
    })

    if (conflictingLanyard) {
      return res.status(400).json({
        error: `Lanyard number ${data.lanyardNumber} already exists for this event`
      })
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date()
  }

  if (data.lanyardNumber !== undefined) updateData.lanyardNumber = data.lanyardNumber
  if (data.type !== undefined) updateData.type = data.type
  if (data.color !== undefined) updateData.color = data.color
  if (data.description !== undefined) updateData.description = data.description
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  // Update lanyard
  const lanyard = await prisma.lanyards.update({
    data: updateData,
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: lanyard,
    message: 'Lanyard updated successfully'
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string, lanyardId: string, userId: string) {
  // This endpoint handles lanyard return
  const validation = returnLanyardSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Find current assignment
  const currentAssignment = await prisma.lanyard_assignments.findFirst({
    where: {
      lanyardId: lanyardId,
      returnedAt: null
      lanyards: {
        select: {
          lanyardNumber: true,
          type: true,
          color: true
        }
      }
    }
  })

  if (!currentAssignment) {
    return res.status(400).json({ error: 'Lanyard is not currently assigned' })
  }

  // Return lanyard
  const returnedAssignment = await prisma.lanyard_assignments.update({
    data: {
      returnedAt: data.returnedAt ? new Date(data.returnedAt) : new Date(),
      returnNotes: data.returnNotes,
      updatedAt: new Date()
      lanyards: {
        select: {
          id: true,
          lanyardNumber: true,
          type: true,
          color: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: returnedAssignment,
    message: 'Lanyard returned successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, lanyardId: string, userRole: string) {
  // Only admins can delete lanyards
  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only administrators can delete lanyards' })
  }

  // Check if lanyard exists
  const existingLanyard = await prisma.lanyards.findUnique({
      }
    }
  })

  if (!existingLanyard || existingLanyard.eventId !== eventId) {
    return res.status(404).json({ error: 'Lanyard not found' })
  }

  // Check if lanyard has assignment history
  if (existingLanyard._count.lanyard_assignments > 0) {
    return res.status(400).json({
      error: 'Cannot delete lanyard with assignment history. Consider deactivating instead.',
      details: { assignmentCount: existingLanyard._count.lanyard_assignments }
    })
  }

  // Delete lanyard
  await prisma.lanyards.delete({
    where: { id: lanyardId }
  })

  return res.status(200).json({
    success: true,
    message: 'Lanyard deleted successfully'
  })
}
