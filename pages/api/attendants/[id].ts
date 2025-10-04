import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for attendant updates
const attendantUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  congregation: z.string().min(1).optional(),
  formsOfService: z.array(z.enum(['Elder', 'Ministerial Servant', 'Exemplary', 'Regular Pioneer', 'Other Department'])).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  userId: z.string().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Attendant ID is required' })
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetAttendant(req, res, id)
      case 'PUT':
        return await handleUpdateAttendant(req, res, id)
      case 'DELETE':
        return await handleDeleteAttendant(req, res, id)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Attendant API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetAttendant(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const attendant = await prisma.attendants.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            congregation: true,
            role: true,
            isActive: true
          }
        }
      }
    })

    if (!attendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found' })
    }

    return res.status(200).json({
      success: true,
      data: attendant
    })
  } catch (error) {
    console.error('Get attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch attendant' })
  }
}

async function handleUpdateAttendant(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const validatedData = attendantUpdateSchema.parse(req.body)

    // Check if attendant exists
    const existingAttendant = await prisma.attendants.findUnique({
      where: { id }
    })

    if (!existingAttendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found' })
    }

    // If email is being updated, check for conflicts
    if (validatedData.email && validatedData.email !== existingAttendant.email) {
      const emailConflict = await prisma.attendants.findFirst({
        where: { 
          email: validatedData.email,
          id: { not: id }
        }
      })
      if (emailConflict) {
        return res.status(400).json({ success: false, error: 'Email already exists' })
      }
    }

    // If userId provided, verify user exists
    if (validatedData.userId) {
      const user = await prisma.users.findUnique({
        where: { id: validatedData.userId }
      })
      if (!user) {
        return res.status(400).json({ success: false, error: 'User not found' })
      }
    }

    const attendant = await prisma.attendants.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            congregation: true,
            role: true,
            isActive: true
          }
        }
      }
    })

    return res.status(200).json({
      success: true,
      data: attendant
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message })
    }
    console.error('Update attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to update attendant' })
  }
}

async function handleDeleteAttendant(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Check if attendant exists
    const existingAttendant = await prisma.attendants.findUnique({
      where: { id }
    })

    if (!existingAttendant) {
      return res.status(404).json({ success: false, error: 'Attendant not found' })
    }

    // Delete the attendant (cascade will handle related records)
    await prisma.attendants.delete({
      where: { id }
    })

    return res.status(200).json({
      success: true,
      message: 'Attendant deleted successfully'
    })
  } catch (error) {
    console.error('Delete attendant error:', error)
    return res.status(500).json({ success: false, error: 'Failed to delete attendant' })
  }
}
