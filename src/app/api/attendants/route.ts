import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, handleAPIError } from '@/lib/api-utils'

// Mock data for attendants (in production, this would come from database)
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
    // Populated user data
    user: {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@jwscheduler.local',
      role: 'ATTENDANT'
    },
    // Populated event data
    event: {
      id: '1',
      title: 'Circuit Assembly',
      date: '2024-01-15T09:00:00Z',
      location: 'Assembly Hall',
      type: 'ASSEMBLY'
    }
  },
  {
    id: '2',
    userId: '2',
    eventId: '2',
    assignedDate: '2024-01-17T19:00:00Z',
    position: 'Sound Department',
    status: 'PENDING',
    notes: 'New attendant, requires training',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    user: {
      id: '2',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@jwscheduler.local',
      role: 'ATTENDANT'
    },
    event: {
      id: '2',
      title: 'Midweek Meeting',
      date: '2024-01-17T19:00:00Z',
      location: 'Kingdom Hall',
      type: 'MEETING'
    }
  },
  {
    id: '3',
    userId: '3',
    eventId: '3',
    assignedDate: '2024-01-21T10:00:00Z',
    position: 'Parking',
    status: 'CONFIRMED',
    notes: 'Reliable, handles large events well',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    user: {
      id: '3',
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@jwscheduler.local',
      role: 'ATTENDANT'
    },
    event: {
      id: '3',
      title: 'Weekend Meeting',
      date: '2024-01-21T10:00:00Z',
      location: 'Kingdom Hall',
      type: 'MEETING'
    }
  },
  {
    id: '4',
    userId: '4',
    eventId: '1',
    assignedDate: '2024-01-15T09:00:00Z',
    position: 'Literature Counter',
    status: 'DECLINED',
    notes: 'Schedule conflict, unavailable for this date',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    user: {
      id: '4',
      firstName: 'Robert',
      lastName: 'Wilson',
      email: 'robert.wilson@jwscheduler.local',
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
]

// Validation schema for creating/updating attendants
const attendantSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  assignedDate: z.string().datetime('Invalid date format'),
  position: z.string().min(1, 'Position is required'),
  status: z.enum(['PENDING', 'CONFIRMED', 'DECLINED'], {
    errorMap: () => ({ message: 'Status must be PENDING, CONFIRMED, or DECLINED' })
  }),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    let filteredAttendants = [...mockAttendants]

    // Filter by eventId if provided
    if (eventId) {
      filteredAttendants = filteredAttendants.filter(a => a.eventId === eventId)
    }

    // Filter by userId if provided
    if (userId) {
      filteredAttendants = filteredAttendants.filter(a => a.userId === userId)
    }

    // Filter by status if provided
    if (status) {
      filteredAttendants = filteredAttendants.filter(a => a.status === status)
    }

    return successResponse(
      { 
        attendants: filteredAttendants,
        total: filteredAttendants.length,
        filters: { eventId, userId, status }
      },
      'Attendants retrieved successfully'
    )

  } catch (error) {
    return handleAPIError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = attendantSchema.parse(body)

    // Check if attendant already exists for this user/event combination
    const existingAttendant = mockAttendants.find(
      a => a.userId === validatedData.userId && a.eventId === validatedData.eventId
    )

    if (existingAttendant) {
      return errorResponse(
        'Attendant assignment already exists for this user and event',
        409
      )
    }

    // Create new attendant assignment
    const newAttendant = {
      id: (mockAttendants.length + 1).toString(),
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // In a real implementation, these would be populated from database joins
      user: {
        id: validatedData.userId,
        firstName: 'New',
        lastName: 'User',
        email: 'new.user@jwscheduler.local',
        role: 'ATTENDANT'
      },
      event: {
        id: validatedData.eventId,
        title: 'New Event',
        date: validatedData.assignedDate,
        location: 'TBD',
        type: 'MEETING'
      }
    }

    // Add to mock data
    mockAttendants.push(newAttendant)

    return successResponse(
      { attendant: newAttendant },
      'Attendant assignment created successfully'
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
