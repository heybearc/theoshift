import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for overseer assignment
const overseerSchema = z.object({
  overseerId: z.string().min(1, 'Overseer ID is required'),
  keymanId: z.string().optional(),
  responsibilities: z.string().optional(),
  positionId: z.string().min(1, 'Position ID is required')
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id: eventId, positionId } = req.query

    if (!eventId || typeof eventId !== 'string' || !positionId || typeof positionId !== 'string') {
      return res.status(400).json({ error: 'Event ID and Position ID are required' })
    }

    // Check user permissions
    const user = await prisma.users.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!user || !['ADMIN', 'OVERSEER', 'admin', 'overseer'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'POST':
        console.log('Overseer assignment request body:', req.body)
        const validatedData = overseerSchema.parse(req.body)
        console.log('Validated overseer data:', validatedData)
        
        // Verify position exists
        const position = await prisma.positions.findUnique({
          where: { id: positionId }
        })

        if (!position) {
          return res.status(404).json({ error: 'Position not found' })
        }

        // Verify overseer exists
        const overseer = await prisma.users.findUnique({
          where: { id: validatedData.overseerId }
        })

        if (!overseer) {
          return res.status(404).json({ error: 'Overseer not found' })
        }

        // Update position with overseer assignment
        const updatedPosition = await prisma.positions.update({
          where: { id: positionId },
          data: {
            overseerId: validatedData.overseerId,
            keymanId: validatedData.keymanId || null,
            responsibilities: validatedData.responsibilities || null,
            updatedAt: new Date()
          }
        })

        return res.status(200).json({
          success: true,
          data: updatedPosition,
          message: 'Overseer assigned successfully'
        })

      default:
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Overseer assignment API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
