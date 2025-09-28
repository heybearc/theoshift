import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for position updates
const positionUpdateSchema = z.object({
  positionNumber: z.number().min(1).optional(),
  positionName: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  isAllDay: z.boolean().optional(),
  isLeadershipPosition: z.boolean().optional(),
  requiresExperience: z.boolean().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { eventId, positionId } = req.query
    if (!eventId || typeof eventId !== 'string' || !positionId || typeof positionId !== 'string') {
      return res.status(400).json({ error: 'Event ID and Position ID are required' })
    }

    switch (req.method) {
      case 'GET':
        const position = await prisma.event_positions.findUnique({
          where: { id: positionId }
        })

        if (!position || position.eventId !== eventId) {
          return res.status(404).json({ error: 'Position not found' })
        }

        return res.status(200).json({
          success: true,
          data: position
        })

      case 'PUT':
        const validatedData = positionUpdateSchema.parse(req.body)
        
        const updatedPosition = await prisma.event_positions.update({
          where: { id: positionId },
          data: {
            ...validatedData,
            updatedAt: new Date()
          }
        })

        return res.status(200).json({
          success: true,
          data: updatedPosition,
          message: 'Position updated successfully'
        })

      case 'DELETE':
        await prisma.event_positions.delete({
          where: { id: positionId }
        })

        return res.status(200).json({
          success: true,
          message: 'Position deleted successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Position API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
