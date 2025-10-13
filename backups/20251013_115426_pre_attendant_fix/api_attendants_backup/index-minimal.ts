import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

// MINIMAL WORKING API - Just return existing attendants
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

    if (req.method === 'GET') {
      return await handleGetEventAttendants(req, res, eventId, event)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Event attendants API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetEventAttendants(req: NextApiRequest, res: NextApiResponse, eventId: string, event: any) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 25
    const offset = (page - 1) * limit

    // Get all attendants - simplified approach
    const attendants = await prisma.attendants.findMany({
      skip: offset,
      take: limit,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    })

    const total = await prisma.attendants.count()
    const pages = Math.ceil(total / limit)

    return res.status(200).json({
      success: true,
      data: {
        attendants: attendants.map(attendant => ({
          id: attendant.id,
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          email: attendant.email,
          phone: attendant.phone,
          congregation: (attendant as any).congregation || '',
          formsOfService: [],
          isActive: true,
          notes: attendant.notes,
          userId: attendant.userId,
          createdAt: attendant.createdAt,
          updatedAt: attendant.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages
        },
        eventId,
        eventName: (event as any).name || 'Event'
      }
    })
  } catch (error) {
    console.error('Get event attendants error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch attendants' })
  }
}
