import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedSession } from '@/lib/auth-helpers'
import { successResponse, errorResponse, handleAPIError, parsePagination, createPagination } from '@/lib/api-utils'
import { CreateEventSchema, EventQuerySchema } from '@/lib/validations'

/**
 * GET /api/events - List events with pagination and filtering
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = EventQuerySchema.parse(Object.fromEntries(searchParams))
    const { page, limit, skip } = parsePagination(searchParams)

    // Build where clause
    const where: any = {}
    
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
              eventAttendantAssociations: true,
              eventPositions: true
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
        ...data,
        startDate,
        endDate,
        createdBy: session.user.id
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        status: true,
        createdAt: true,
        createdBy: true
      }
    })

    return successResponse(event, 'Event created successfully')
  } catch (error) {
    return handleAPIError(error)
  }
}
