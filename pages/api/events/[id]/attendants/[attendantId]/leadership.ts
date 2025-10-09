import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema for leadership assignment
const leadershipSchema = z.object({
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
      const validatedData = leadershipSchema.parse(req.body)

      // Find the position assignment first (NEW SYSTEM)
      const positionAssignment = await prisma.position_assignments.findFirst({
        where: {
          attendantId: attendantId,
          position: {
            eventId: eventId
          }
        }
      })
      
      console.log(`🔍 Looking for position assignment: eventId=${eventId}, attendantId=${attendantId}`)
      console.log(`🔍 Found position assignment:`, positionAssignment ? positionAssignment.id : 'NOT FOUND')

      if (!positionAssignment) {
        return res.status(404).json({ error: 'Attendant position assignment not found' })
      }

      // Update the position assignment with leadership assignments (NEW SYSTEM)
      const updatedAssignment = await prisma.position_assignments.update({
        where: {
          id: positionAssignment.id
        },
        data: {
          overseerId: validatedData.overseerId,
          keymanId: validatedData.keymanId
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
        assignment: updatedAssignment
      })

    } catch (error) {
      console.error('Error updating attendant leadership:', error)
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: error.errors 
        })
      }

      return res.status(500).json({ 
        error: 'Failed to update attendant leadership' 
      })
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' })
}
