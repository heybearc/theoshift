import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'

// Validation schema for lanyard creation
const lanyardSchema = z.object({
  badgeNumber: z.string().min(1, 'Badge number is required').max(50),
  notes: z.string().optional()
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

    switch (req.method) {
      case 'GET':
        const lanyards = await prisma.lanyards.findMany({
          where: { lanyardSettingId: eventId },
          orderBy: { badgeNumber: 'asc' }
        })

        return res.status(200).json({
          success: true,
          data: lanyards,
          total: lanyards.length
        })

      case 'POST':
        const validatedData = lanyardSchema.parse(req.body)
        
        const newLanyard = await prisma.lanyards.create({
          data: {
            id: crypto.randomUUID(),
            lanyardSettingId: eventId,
            badgeNumber: validatedData.badgeNumber,
            status: 'AVAILABLE',
            notes: validatedData.notes,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return res.status(201).json({
          success: true,
          data: newLanyard,
          message: 'Lanyard created successfully'
        })

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event Lanyards API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
