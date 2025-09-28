import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for position creation
const positionSchema = z.object({
  positionNumber: z.number().min(1, 'Position number is required'),
  positionName: z.string().min(1, 'Position name is required').max(100),
  description: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().default(true),
  isAllDay: z.boolean().default(false),
  isLeadershipPosition: z.boolean().default(false),
  requiresExperience: z.boolean().default(false)
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { eventId } = req.query
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID is required' })
    }

    // Check if user has admin or overseer role
    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        const positions = await prisma.event_positions.findMany({
          where: { eventId: eventId },
          orderBy: { positionNumber: 'asc' }
        })

        return res.status(200).json({
          success: true,
          data: positions,
          total: positions.length
        })

      case 'POST':
        const validatedData = positionSchema.parse(req.body)
        
        const newPosition = await prisma.event_positions.create({
          data: {
            id: crypto.randomUUID(),
            eventId: eventId,
            positionNumber: validatedData.positionNumber,
            positionName: validatedData.positionName,
            description: validatedData.description,
            department: validatedData.department,
            isActive: validatedData.isActive,
            isAllDay: validatedData.isAllDay,
            isLeadershipPosition: validatedData.isLeadershipPosition,
            requiresExperience: validatedData.requiresExperience,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return res.status(201).json({
          success: true,
          data: newPosition,
          message: 'Position created successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event Positions API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
