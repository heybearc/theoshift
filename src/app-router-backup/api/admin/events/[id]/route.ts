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

// GET /api/admin/events/[id] - Get specific event with attendant assignments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = parseInt(params.id);
    
    if (isNaN(eventId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid event ID'
      }, { status: 400 });
    }

    // Get event details
    const eventQuery = `
      SELECT 
        e.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM event_attendants ea WHERE ea.event_id = e.id) as total_assignments,
        (SELECT COUNT(*) FROM event_attendants ea WHERE ea.event_id = e.id AND ea.status = 'confirmed') as confirmed_assignments
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    
    const eventResult = await pool.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Get attendant assignments for this event
    const assignmentsQuery = `
      SELECT 
        ea.*,
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
        a.congregation,
        a.privileges,
        a.skills,
        u.name as assigned_by_name
      FROM event_attendants ea
      JOIN attendants a ON ea.attendant_id = a.id
      LEFT JOIN users u ON ea.assigned_by = u.id
      WHERE ea.event_id = $1
      ORDER BY ea.assignment_role, a.last_name, a.first_name
    `;

    const assignmentsResult = await pool.query(assignmentsQuery, [eventId]);

    return NextResponse.json({
      success: true,
      data: {
        event,
        assignments: assignmentsResult.rows
      }
    });

  } catch (error) {
    console.error('Event GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/admin/events/[id] - Update specific event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = parseInt(params.id);
    
    if (isNaN(eventId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid event ID'
      }, { status: 400 });
    }

    const body = await request.json();

    // Check if event exists
    const existsQuery = 'SELECT id FROM events WHERE id = $1';
    const existsResult = await pool.query(existsQuery, [eventId]);
    
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
    values.push(eventId);

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
    console.error('Event PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/admin/events/[id] - Delete specific event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = parseInt(params.id);
    
    if (isNaN(eventId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid event ID'
      }, { status: 400 });
    }

    // Check if event exists
    const existsQuery = 'SELECT id, title FROM events WHERE id = $1';
    const existsResult = await pool.query(existsQuery, [eventId]);
    
    if (existsResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    const event = existsResult.rows[0];

    // Check if event has attendant assignments
    const assignmentsQuery = 'SELECT COUNT(*) FROM event_attendants WHERE event_id = $1';
    const assignmentsResult = await pool.query(assignmentsQuery, [eventId]);
    const assignmentCount = parseInt(assignmentsResult.rows[0].count);

    if (assignmentCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete event "${event.title}" as it has ${assignmentCount} attendant assignment(s). Remove assignments first.`
      }, { status: 409 });
    }

    // Delete the event
    const deleteQuery = 'DELETE FROM events WHERE id = $1';
    await pool.query(deleteQuery, [eventId]);

    return NextResponse.json({
      success: true,
      message: `Event "${event.title}" deleted successfully`
    });

  } catch (error) {
    console.error('Event DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
