import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Event types enum
const EVENT_TYPES = [
  'assembly',
  'convention',
  'circuit_overseer_visit',
  'special_event',
  'meeting',
  'memorial',
  'other'
] as const;

type EventType = typeof EVENT_TYPES[number];

interface Event {
  id?: number;
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time?: string;
  location: string;
  capacity?: number;
  attendants_needed?: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

// GET /api/admin/events - List all events with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const eventType = searchParams.get('event_type') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (eventType && EVENT_TYPES.includes(eventType as EventType)) {
      whereClause += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM events ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get events with pagination
    const eventsQuery = `
      SELECT 
        e.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM event_attendants ea WHERE ea.event_id = e.id) as assigned_attendants
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.start_date DESC, e.start_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const eventsResult = await pool.query(eventsQuery, params);

    return NextResponse.json({
      success: true,
      data: {
        events: eventsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Events GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/admin/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'event_type', 'start_date', 'end_date', 'start_time', 'location'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    // Validate event type
    if (!EVENT_TYPES.includes(body.event_type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid event type. Must be one of: ${EVENT_TYPES.join(', ')}`
      }, { status: 400 });
    }

    // Validate dates
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    if (startDate > endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date must be before or equal to end date'
      }, { status: 400 });
    }

    // Create event
    const insertQuery = `
      INSERT INTO events (
        title, description, event_type, start_date, end_date, 
        start_time, end_time, location, capacity, attendants_needed, 
        status, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      body.title,
      body.description || null,
      body.event_type,
      body.start_date,
      body.end_date,
      body.start_time,
      body.end_time || null,
      body.location,
      body.capacity || null,
      body.attendants_needed || null,
      body.status || 'draft',
      body.created_by || 1 // Default to admin user for now
    ];

    const result = await pool.query(insertQuery, values);
    const newEvent = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      data: { event: newEvent }
    }, { status: 201 });

  } catch (error) {
    console.error('Events POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/admin/events - Update event (expects event ID in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Event ID is required for update'
      }, { status: 400 });
    }

    // Check if event exists
    const existsQuery = 'SELECT id FROM events WHERE id = $1';
    const existsResult = await pool.query(existsQuery, [body.id]);
    
    if (existsResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    // Validate event type if provided
    if (body.event_type && !EVENT_TYPES.includes(body.event_type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid event type. Must be one of: ${EVENT_TYPES.join(', ')}`
      }, { status: 400 });
    }

    // Validate dates if provided
    if (body.start_date && body.end_date) {
      const startDate = new Date(body.start_date);
      const endDate = new Date(body.end_date);
      if (startDate > endDate) {
        return NextResponse.json({
          success: false,
          error: 'Start date must be before or equal to end date'
        }, { status: 400 });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    const updatableFields = [
      'title', 'description', 'event_type', 'start_date', 'end_date',
      'start_time', 'end_time', 'location', 'capacity', 'attendants_needed', 'status'
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`);
    
    // Add ID for WHERE clause
    values.push(body.id);

    const updateQuery = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const updatedEvent = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      data: { event: updatedEvent }
    });

  } catch (error) {
    console.error('Events PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/admin/events - Delete event (expects event ID in body)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Event ID is required for deletion'
      }, { status: 400 });
    }

    // Check if event exists
    const existsQuery = 'SELECT id, title FROM events WHERE id = $1';
    const existsResult = await pool.query(existsQuery, [body.id]);
    
    if (existsResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    const event = existsResult.rows[0];

    // Check if event has attendant assignments
    const assignmentsQuery = 'SELECT COUNT(*) FROM event_attendants WHERE event_id = $1';
    const assignmentsResult = await pool.query(assignmentsQuery, [body.id]);
    const assignmentCount = parseInt(assignmentsResult.rows[0].count);

    if (assignmentCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete event "${event.title}" as it has ${assignmentCount} attendant assignment(s). Remove assignments first.`
      }, { status: 409 });
    }

    // Delete the event
    const deleteQuery = 'DELETE FROM events WHERE id = $1';
    await pool.query(deleteQuery, [body.id]);

    return NextResponse.json({
      success: true,
      message: `Event "${event.title}" deleted successfully`
    });

  } catch (error) {
    console.error('Events DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
