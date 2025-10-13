import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema for oversight assignment
const oversightSchema = z.object({
  overseerId: z.string().nullable().optional(),
  keymanId: z.string().nullable().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get session for authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id: eventId, attendantId } = req.query

  if (typeof eventId !== 'string' || typeof attendantId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  if (req.method === 'PUT') {
    try {
      // Validate request body
      const validatedData = oversightSchema.parse(req.body)

      // APEX GUARDIAN: Event Attendants page shows ALL attendants
      // We need to create event-attendant associations to store oversight assignments
      console.log(`🔍 Updating oversight for attendant: eventId=${eventId}, attendantId=${attendantId}`)
      console.log(`🔍 Oversight data:`, validatedData)

      // Verify the attendant exists and is active
      const attendant = await prisma.attendants.findFirst({
        where: {
          id: attendantId,
          isActive: true
        }
      })

      if (!attendant) {
        return res.status(404).json({ error: 'Attendant not found or inactive' })
      }

      // Find or create an event-attendant association
      let association = await prisma.event_attendants.findFirst({
        where: {
          eventId: eventId,
          attendantId: attendantId
        }
      })

      if (!association) {
        // Create new association
        association = await prisma.event_attendants.create({
          data: {
            id: require('crypto').randomUUID(),
            eventId: eventId,
            attendantId: attendantId,
            overseerId: validatedData.overseerId,
            keymanId: validatedData.keymanId,
            updatedAt: new Date()
          }
        })
        
        console.log(`✅ Created new event-attendant association: ${association.id}`)
      } else {
        // Update existing association
        association = await prisma.event_attendants.update({
          where: {
            id: association.id
          },
          data: {
            overseerId: validatedData.overseerId,
            keymanId: validatedData.keymanId
          }
        })
        
        console.log(`✅ Updated existing event-attendant association: ${association.id}`)
      }

      // Fetch the updated association with related data
      const updatedAssociation = await prisma.event_attendants.findUnique({
        where: {
          id: association.id
        },
        include: {
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
      })

      return res.status(200).json({
        success: true,
        association: updatedAssociation
      })

    } catch (error) {
      console.error('Error updating attendant oversight:', error)
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors 
        })
      }

      return res.status(500).json({ 
        error: 'Failed to update attendant oversight' 
      })
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' })
}
