import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/apiError'

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

  const { id: eventId, volunteerId } = req.query

  if (typeof eventId !== 'string' || typeof volunteerId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  if (req.method === 'PUT') {
    try {
      // Validate request body
      const validatedData = oversightSchema.parse(req.body)

      // APEX GUARDIAN: Event Volunteers page shows ALL volunteers
      // We need to create event-volunteer associations to store oversight assignments

      // Verify the volunteer exists.
      // Do not restrict by isActive: users may need to clear oversight on inactive volunteers.
      const volunteer = await prisma.volunteers.findFirst({
        where: {
          id: volunteerId
        }
      })

      if (!volunteer) {
        return res.status(404).json({ error: 'Volunteer not found' })
      }

      // Find or create an event-volunteer association
      let association = await prisma.event_volunteers.findFirst({
        where: {
          eventId: eventId,
          volunteerId: volunteerId
        }
      })

      if (!association) {
        // Create new association
        association = await prisma.event_volunteers.create({
          data: {
            id: require('crypto').randomUUID(),
            eventId: eventId,
            volunteerId: volunteerId,
            overseerId: validatedData.overseerId,
            keymanId: validatedData.keymanId,
            updatedAt: new Date()
          }
        })
        
      } else {
        // Update existing association
        association = await prisma.event_volunteers.update({
          where: {
            id: association.id
          },
          data: {
            ...(validatedData.overseerId !== undefined ? { overseerId: validatedData.overseerId } : {}),
            ...(validatedData.keymanId !== undefined ? { keymanId: validatedData.keymanId } : {}),
          }
        })
        
      }

      // Fetch the updated association with related data
      const updatedAssociation = await prisma.event_volunteers.findUnique({
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
      // Error logged by handleApiError
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors 
        })
      }

      return res.status(500).json({ 
        error: 'Failed to update volunteer oversight' 
      })
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' })
}
