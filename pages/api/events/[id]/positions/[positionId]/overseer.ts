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

    const { id, positionId: posId } = req.query
    const eventId = Array.isArray(id) ? id[0] : id
    const positionId = Array.isArray(posId) ? posId[0] : posId

    console.log('Event ID:', eventId, 'Type:', typeof eventId)
    console.log('Position ID:', positionId, 'Type:', typeof positionId)

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
        console.log('Position ID received:', positionId)
        const validatedData = overseerSchema.parse(req.body)
        console.log('Validated overseer data:', validatedData)
        
        // Verify position exists in positions table
        const position = await prisma.positions.findUnique({
          where: { id: positionId }
        })
        
        console.log('Position lookup result:', position ? 'Found' : 'Not found')
        
        if (!position) {
          // Also check event_positions table for debugging
          const eventPosition = await prisma.event_positions.findUnique({
            where: { id: positionId }
          })
          console.log('Event position lookup result:', eventPosition ? 'Found' : 'Not found')
          return res.status(404).json({ error: 'Position not found' })
        }

        // Verify overseer exists in attendants table
        const overseer = await prisma.attendants.findUnique({
          where: { id: validatedData.overseerId }
        })

        console.log('Overseer lookup result:', overseer ? 'Found' : 'Not found')

        if (!overseer) {
          return res.status(404).json({ error: 'Overseer not found' })
        }

        // Verify keyman exists if provided
        if (validatedData.keymanId) {
          const keyman = await prisma.attendants.findUnique({
            where: { id: validatedData.keymanId }
          })
          
          console.log('Keyman lookup result:', keyman ? 'Found' : 'Not found')
          
          if (!keyman) {
            return res.status(404).json({ error: 'Keyman not found' })
          }
        }

        // APEX GUARDIAN: Create position-level oversight assignment (NOT tied to shifts)
        
        // Find existing oversight assignment for this position
        const existingOversight = await (prisma as any).position_oversight_assignments.findFirst({
          where: {
            positionId: positionId,
            eventId: eventId
          }
        })

        let oversightAssignment
        if (existingOversight) {
          // Update existing oversight assignment
          console.log('Updating existing oversight assignment:', existingOversight.id)
          oversightAssignment = await (prisma as any).position_oversight_assignments.update({
            where: { id: existingOversight.id },
            data: {
              overseerId: validatedData.overseerId,
              keymanId: validatedData.keymanId || null,
              assignedBy: user.id,
              updatedAt: new Date()
            },
            include: {
              position: {
                select: { name: true, positionNumber: true }
              },
              overseer: {
                select: { id: true, firstName: true, lastName: true }
              },
              keyman: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          })
        } else {
          // Create new position-level oversight assignment
          console.log('Creating new position-level oversight assignment')
          oversightAssignment = await (prisma as any).position_oversight_assignments.create({
            data: {
              positionId: positionId,
              eventId: eventId,
              overseerId: validatedData.overseerId,
              keymanId: validatedData.keymanId || null,
              assignedBy: user.id
            },
            include: {
              position: {
                select: { name: true, positionNumber: true }
              },
              overseer: {
                select: { id: true, firstName: true, lastName: true }
              },
              keyman: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          })
        }

        console.log('✅ Successfully created/updated position-level oversight assignment:', oversightAssignment.id)

        return res.status(201).json({
          success: true,
          data: {
            oversightAssignment
          },
          message: oversightAssignment.keyman ? 
            'Overseer and keyman assigned successfully' : 
            'Overseer assigned successfully'
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
