import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'

// APEX GUARDIAN: Event Positions CRUD API
// Manages positions for specific events with proper validation

const positionCreateSchema = z.object({
  positionNumber: z.number().min(1).max(1000),
  name: z.string().min(1, 'Position name is required'),
  description: z.string().optional(),
  area: z.string().optional(),
  sequence: z.number().optional()
})

const positionUpdateSchema = z.object({
  name: z.string().min(1, 'Position name is required').optional(),
  description: z.string().optional(),
  area: z.string().optional(),
  sequence: z.number().optional(),
  isActive: z.boolean().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetPositions(req, res, eventId)
      case 'POST':
        return await handleCreatePosition(req, res, eventId)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Positions API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetPositions(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const area = req.query.area as string
    const includeShifts = req.query.includeShifts === 'true'
    const includeAssignments = req.query.includeAssignments === 'true'
    const includeInactive = req.query.includeInactive === 'true'
    
    const offset = (page - 1) * limit

    const where = {
      eventId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(area && { area })
    }

    const positions = await prisma.positions.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: [
        { sequence: 'asc' },
        { positionNumber: 'asc' }
      ],
      include: {
        ...(includeShifts && {
          shifts: {
            orderBy: { sequence: 'asc' }
          }
        }),
        ...(includeAssignments && {
          assignments: {
            include: {
              attendant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
              shift: true
            }
          }
        })
      }
    })

    const total = await prisma.positions.count({ where })
    const pages = Math.ceil(total / limit)

    // Get areas for filtering
    const areas = await prisma.positions.findMany({
      where: { eventId, ...(includeInactive ? {} : { isActive: true }) },
      select: { area: true },
      distinct: ['area']
    })

    return res.status(200).json({
      success: true,
      data: {
        positions,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        areas: areas.map(a => a.area).filter(Boolean),
        eventId
      }
    })
  } catch (error) {
    console.error('Get positions error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch positions' })
  }
}

async function handleCreatePosition(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  try {
    const validatedData = positionCreateSchema.parse(req.body)

    // Check if position number already exists
    const existingPosition = await prisma.positions.findUnique({
      where: {
        eventId_positionNumber: {
          eventId,
          positionNumber: validatedData.positionNumber
        }
      }
    })

    if (existingPosition) {
      return res.status(400).json({
        success: false,
        error: `Position ${validatedData.positionNumber} already exists`
      })
    }

    // Get next sequence number if not provided
    const sequence = validatedData.sequence || validatedData.positionNumber

    const position = await prisma.positions.create({
      data: {
        eventId,
        positionNumber: validatedData.positionNumber,
        name: validatedData.name,
        description: validatedData.description,
        area: validatedData.area,
        sequence
      },
      include: {
        shifts: true
      }
    })

    return res.status(201).json({
      success: true,
      data: position
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      })
    }

    console.error('Create position error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create position'
    })
  }
}
