-- Migration: Update existing events table to match Event Management API schema
-- Description: Transform Prisma events schema to Event Management schema
-- Version: 004
-- Date: 2024-09-24

-- First, backup existing data if needed
-- CREATE TABLE events_backup AS SELECT * FROM events;

-- Drop existing events table and recreate with proper schema
DROP TABLE IF EXISTS events CASCADE;

-- Recreate events table with Event Management schema
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'assembly', 'convention', 'circuit_overseer_visit', 
        'special_event', 'meeting', 'memorial', 'other'
    )),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location VARCHAR(500) NOT NULL,
    capacity INTEGER CHECK (capacity > 0),
    attendants_needed INTEGER CHECK (attendants_needed >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'published', 'cancelled', 'completed'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (start_date <= end_date),
    CONSTRAINT valid_capacity_vs_needed CHECK (
        capacity IS NULL OR attendants_needed IS NULL OR attendants_needed <= capacity
    )
);

-- Recreate indexes
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_search ON events USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || location));

-- Recreate trigger
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample events for testing
INSERT INTO events (
    title, description, event_type, start_date, end_date, start_time, end_time,
    location, capacity, attendants_needed, status, created_by
) VALUES 
(
    'Circuit Assembly', 
    'Semi-annual circuit assembly with morning and afternoon sessions',
    'assembly',
    '2024-10-15',
    '2024-10-15',
    '09:30:00',
    '16:00:00',
    'Kingdom Hall - Main Auditorium',
    200,
    15,
    'published',
    1
),
(
    'Regional Convention 2024',
    'Three-day regional convention with multiple sessions and baptisms',
    'convention',
    '2024-11-08',
    '2024-11-10',
    '09:20:00',
    '16:30:00',
    'Convention Center - Downtown',
    1500,
    50,
    'draft',
    1
),
(
    'Circuit Overseer Visit',
    'Weekly visit from circuit overseer with special talks and meetings',
    'circuit_overseer_visit',
    '2024-10-28',
    '2024-11-03',
    '19:00:00',
    '21:00:00',
    'Kingdom Hall - Main Auditorium',
    150,
    8,
    'published',
    1
),
(
    'Memorial 2025',
    'Annual Memorial of Christ\'s death - most important event of the year',
    'memorial',
    '2025-04-13',
    '2025-04-13',
    '19:30:00',
    '20:30:00',
    'Kingdom Hall - Main Auditorium',
    250,
    12,
    'draft',
    1
),
(
    'Special Pioneer Meeting',
    'Quarterly meeting for special pioneers and circuit overseers',
    'special_event',
    '2024-12-07',
    '2024-12-07',
    '10:00:00',
    '15:00:00',
    'Kingdom Hall - Secondary Hall',
    50,
    5,
    'draft',
    1
)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE events IS 'Events management table for JW Attendant Scheduler - Updated schema for Event Management API';
