import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, handleAPIError } from '@/lib/api-utils'

// Event validation schema
const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().datetime('Invalid date format'),
  location: z.string().min(1, 'Location is required'),
  type: z.enum(['MEETING', 'SERVICE', 'ASSEMBLY', 'CONVENTION', 'OTHER']),
  attendantsNeeded: z.number().int().min(0, 'Attendants needed must be non-negative'),
  isActive: z.boolean().default(true)
})

// GET /api/events - List all events
export async function GET(request: NextRequest) {
  try {
    // For now, skip authentication to test the API
    // TODO: Add authentication back when testing is complete
    
<<<<<<< HEAD
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.startDate) {
      where.startDate = { gte: new Date(query.startDate) }
    }
    
    if (query.endDate) {
      where.endDate = { lte: new Date(query.endDate) }
    }

    // Get events and total count
    const [events, total] = await Promise.all([
      prisma.events.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          location: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              event_attendant_associations: true,
              event_positions: true,
              assignments: true
            }
          }
        }
      }),
      prisma.events.count({ where })
    ])

    const pagination = createPagination(page, limit, total)

    return successResponse(events, undefined, pagination)
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * POST /api/events - Create new event (Admin/Overseer only)
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const canCreateEvents = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'].includes(session.user.role)
    if (!canCreateEvents) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to create events' }, { status: 403 })
    }

    const body = await req.json()
    const data = CreateEventSchema.parse(body)

    // Validate date range
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    
    if (endDate <= startDate) {
      return errorResponse('End date must be after start date', 400)
    }

    // Create event
    const event = await prisma.events.create({
      data: {
        id: crypto.randomUUID(),
        ...data,
        startDate,
        endDate,
        updatedAt: new Date(),
        createdBy: session.user.id
=======
    // Mock data for Phase 4 implementation
    const mockEvents = [
      {
        id: '1',
        title: 'Circuit Assembly',
        description: 'Semi-annual circuit assembly',
        date: '2024-01-15T09:00:00Z',
        location: 'Assembly Hall',
        type: 'ASSEMBLY',
        attendantsNeeded: 12,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
>>>>>>> feature/api-foundation
      },
      {
        id: '2', 
        title: 'Midweek Meeting',
        description: 'Regular midweek meeting',
        date: '2024-01-17T19:00:00Z',
        location: 'Kingdom Hall',
        type: 'MEETING',
        attendantsNeeded: 4,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '3',
        title: 'Weekend Meeting',
        description: 'Public meeting and Watchtower study',
        date: '2024-01-21T10:00:00Z',
        location: 'Kingdom Hall',
        type: 'MEETING',
        attendantsNeeded: 6,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]

    return successResponse({
      events: mockEvents,
      total: mockEvents.length
    })

  } catch (error) {
    return handleAPIError(error)
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    // For now, skip authentication to test the API
    // TODO: Add authentication back when testing is complete

    const body = await request.json()
    const validatedData = EventSchema.parse(body)

    // Mock creation for Phase 4 - will be replaced with database integration
    const newEvent = {
      id: Date.now().toString(),
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return successResponse(
      { event: newEvent },
      'Event created successfully'
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        'Validation failed: ' + error.issues.map(e => e.message).join(', '),
        400
      )
    }
    return handleAPIError(error)
  }
}
