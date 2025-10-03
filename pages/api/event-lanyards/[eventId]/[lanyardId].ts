import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for lanyard updates
const lanyardUpdateSchema = z.object({
  badgeNumber: z.string().min(1).max(50).optional(),
  status: z.enum(['AVAILABLE', 'CHECKED_OUT', 'LOST', 'DAMAGED']).optional(),
  notes: z.string().optional(),
  isCheckedOut: z.boolean().optional(),
  checkedOutTo: z.string().optional(),
  checkedOutAt: z.string().optional(),
  checkedInAt: z.string().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { eventId, lanyardId } = req.query
    if (!eventId || typeof eventId !== 'string' || !lanyardId || typeof lanyardId !== 'string') {
      return res.status(400).json({ error: 'Event ID and Lanyard ID are required' })
    }

    switch (req.method) {
      case 'GET':
        const lanyard = await prisma.lanyards.findUnique({
          where: { id: lanyardId }
        })

        if (!lanyard) {
          return res.status(404).json({ error: 'Lanyard not found' })
        }

        return res.status(200).json({
          success: true,
          data: lanyard
        })

      case 'PUT':
        const validatedData = lanyardUpdateSchema.parse(req.body)
        
        const updatedLanyard = await prisma.lanyards.update({
          where: { id: lanyardId },
          data: {
            ...validatedData,
            updatedAt: new Date()
          }
        })

        return res.status(200).json({
          success: true,
          data: updatedLanyard,
          message: 'Lanyard updated successfully'
        })

      case 'DELETE':
        await prisma.lanyards.delete({
          where: { id: lanyardId }
        })

        return res.status(200).json({
          success: true,
          message: 'Lanyard deleted successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Lanyard API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
