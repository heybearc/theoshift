import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, handleAPIError } from '@/lib/api-utils'

// This would normally import from the main attendants route or a shared data source
// For now, we'll use the same mock data structure
const mockAttendants = [
  {
    id: '1',
    userId: '1',
    eventId: '1',
    assignedDate: '2024-01-15T09:00:00Z',
    position: 'Main Entrance',
    status: 'CONFIRMED',
    notes: 'Experienced attendant, prefers morning shifts',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    user: {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@jwscheduler.local',
      role: 'ATTENDANT'
    },
    event: {
      id: '1',
      title: 'Circuit Assembly',
      date: '2024-01-15T09:00:00Z',
      location: 'Assembly Hall',
      type: 'ASSEMBLY'
    }
  }
  // ... other mock data would be here
]

const updateAttendantSchema = z.object({
  position: z.string().min(1, 'Position is required').optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'DECLINED'], {
    errorMap: () => ({ message: 'Status must be PENDING, CONFIRMED, or DECLINED' })
  }).optional(),
  notes: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendant = mockAttendants.find(a => a.id === params.id)

    if (!attendant) {
      return errorResponse('Attendant not found', 404)
    }

    return successResponse(
      { attendant },
      'Attendant retrieved successfully'
    )

  } catch (error) {
    return handleAPIError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantIndex = mockAttendants.findIndex(a => a.id === params.id)

    if (attendantIndex === -1) {
      return errorResponse('Attendant not found', 404)
    }

    const body = await request.json()
    const validatedData = updateAttendantSchema.parse(body)

    // Update the attendant
    const updatedAttendant = {
      ...mockAttendants[attendantIndex],
      ...validatedData,
      updatedAt: new Date().toISOString()
    }

    mockAttendants[attendantIndex] = updatedAttendant

    return successResponse(
      { attendant: updatedAttendant },
      'Attendant updated successfully'
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantIndex = mockAttendants.findIndex(a => a.id === params.id)

    if (attendantIndex === -1) {
      return errorResponse('Attendant not found', 404)
    }

    // Remove the attendant
    const deletedAttendant = mockAttendants.splice(attendantIndex, 1)[0]

    return successResponse(
      { attendant: deletedAttendant },
      'Attendant assignment deleted successfully'
    )

  } catch (error) {
    return handleAPIError(error)
  }
}
