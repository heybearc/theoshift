import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

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
        // First find the lanyard settings for this event
        const lanyardSettings = await prisma.lanyard_settings.findUnique({
          where: { eventId: eventId }
        })

        if (!lanyardSettings) {
          return res.status(200).json({
            success: true,
            data: [],
            total: 0
          })
        }

        const lanyards = await prisma.lanyards.findMany({
          where: { lanyardSettingId: lanyardSettings.id },
          orderBy: [
            { 
              badgeNumber: 'asc' 
            }
          ]
        })

        // Sort lanyards numerically by badge number
        const sortedLanyards = lanyards.sort((a, b) => {
          const aNum = parseInt(a.badgeNumber.replace(/\D/g, '')) || 0
          const bNum = parseInt(b.badgeNumber.replace(/\D/g, '')) || 0
          return aNum - bNum
        })

        return res.status(200).json({
          success: true,
          data: sortedLanyards,
          total: sortedLanyards.length
        })

      case 'POST':
        const validatedData = lanyardSchema.parse(req.body)
        
        // Find or create lanyard settings for this event
        let lanyardSettingsForCreate = await prisma.lanyard_settings.findUnique({
          where: { eventId: eventId }
        })

        if (!lanyardSettingsForCreate) {
          lanyardSettingsForCreate = await prisma.lanyard_settings.create({
            data: {
              id: crypto.randomUUID(),
              eventId: eventId,
              totalLanyards: 1,
              availableLanyards: 1,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }

        // Check if lanyard with this badge number already exists
        const existingLanyard = await prisma.lanyards.findFirst({
          where: {
            lanyardSettingId: lanyardSettingsForCreate.id,
            badgeNumber: validatedData.badgeNumber
          }
        })

        if (existingLanyard) {
          return res.status(400).json({ 
            success: false, 
            error: `Lanyard with badge number "${validatedData.badgeNumber}" already exists` 
          })
        }
        
        const newLanyard = await prisma.lanyards.create({
          data: {
            id: crypto.randomUUID(),
            lanyardSettingId: lanyardSettingsForCreate.id,
            badgeNumber: validatedData.badgeNumber,
            status: 'AVAILABLE',
            notes: validatedData.notes,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Update lanyard settings count
        await prisma.lanyard_settings.update({
          where: { id: lanyardSettingsForCreate.id },
          data: {
            totalLanyards: { increment: 1 },
            availableLanyards: { increment: 1 },
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
