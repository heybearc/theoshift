import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedSession } from '@/lib/auth-helpers'
import { successResponse, errorResponse, handleAPIError } from '@/lib/api-utils'
import { UpdateEventSchema, IdParamSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/events/[id] - Get event by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { id } = IdParamSchema.parse(await params)

    const event = await prisma.events.findUnique({
      where: { id },
      include: {
        event_attendant_associations: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        event_positions: {
          include: {
            position_shifts: true,
            assignments: {
              include: {
                users: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            event_attendant_associations: true,
            event_positions: true,
            assignments: true
          }
        }
      }
    })

    if (!event) {
      return errorResponse('Event not found', 404)
    }

    return successResponse(event)
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * PUT /api/events/[id] - Update event
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and permissions
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const canUpdateEvents = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'].includes(session.user.role)
    if (!canUpdateEvents) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to update events' }, { status: 403 })
    }

    const { id } = IdParamSchema.parse(await params)
    const body = await req.json()
    const data = UpdateEventSchema.parse(body)

    // Validate date range if both dates are provided
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      
      if (endDate <= startDate) {
        return errorResponse('End date must be after start date', 400)
      }
    }

    // Convert date strings to Date objects
    const updateData: any = { ...data }
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const event = await prisma.events.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        status: true,
        updatedAt: true
      }
    })

    return successResponse(event, 'Event updated successfully')
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * DELETE /api/events/[id] - Delete event (Admin only)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and admin role
    const session = await getAuthenticatedSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { id } = IdParamSchema.parse(await params)

    // Check if event has associated data
    const eventWithAssociations = await prisma.events.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            event_attendant_associations: true,
            event_positions: true,
            assignments: true
          }
        }
      }
    })

    if (!eventWithAssociations) {
      return errorResponse('Event not found', 404)
    }

    // Warn if event has associations
    const hasAssociations = 
      eventWithAssociations._count.event_attendant_associations > 0 ||
      eventWithAssociations._count.event_positions > 0 ||
      eventWithAssociations._count.assignments > 0

    if (hasAssociations) {
      return errorResponse(
        'Cannot delete event with existing attendants, positions, or assignments. Please remove associations first.',
        400
      )
    }

    await prisma.events.delete({
      where: { id }
    })

    return successResponse(null, 'Event deleted successfully')
  } catch (error) {
    return handleAPIError(error)
  }
}
