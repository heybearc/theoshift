-- Migration: Create events table and related structures
-- Description: Events management system for JW Attendant Scheduler
-- Version: 003
-- Date: 2024-09-24

-- Create events table
CREATE TABLE IF NOT EXISTS events (
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

-- Create attendants table (for future attendant management)
CREATE TABLE IF NOT EXISTS attendants (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    congregation VARCHAR(200),
    privileges TEXT[], -- Array of privileges/qualifications
    skills TEXT[], -- Array of skills (parking, security, stage, etc.)
    availability_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create event_attendants junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS event_attendants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attendant_id INTEGER NOT NULL REFERENCES attendants(id) ON DELETE CASCADE,
    assignment_role VARCHAR(100) NOT NULL, -- parking, security, stage, usher, etc.
    assignment_details TEXT,
    shift_start TIME,
    shift_end TIME,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN (
        'assigned', 'confirmed', 'declined', 'completed', 'no_show'
    )),
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Prevent duplicate assignments
    UNIQUE(event_id, attendant_id, assignment_role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || location));

CREATE INDEX IF NOT EXISTS idx_attendants_name ON attendants(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_attendants_email ON attendants(email);
CREATE INDEX IF NOT EXISTS idx_attendants_active ON attendants(is_active);
CREATE INDEX IF NOT EXISTS idx_attendants_skills ON attendants USING gin(skills);

CREATE INDEX IF NOT EXISTS idx_event_attendants_event ON event_attendants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendants_attendant ON event_attendants(attendant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendants_role ON event_attendants(assignment_role);
CREATE INDEX IF NOT EXISTS idx_event_attendants_status ON event_attendants(status);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendants_updated_at ON attendants;
CREATE TRIGGER update_attendants_updated_at
    BEFORE UPDATE ON attendants
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

-- Insert sample attendants for testing
INSERT INTO attendants (
    first_name, last_name, email, phone, congregation, 
    privileges, skills, is_active, created_by
) VALUES 
(
    'John', 'Smith', 'john.smith@email.com', '555-0101', 'Central Congregation',
    ARRAY['Elder', 'Circuit Overseer'], 
    ARRAY['parking', 'security', 'stage'], 
    true, 1
),
(
    'Michael', 'Johnson', 'mike.johnson@email.com', '555-0102', 'North Congregation',
    ARRAY['Ministerial Servant'], 
    ARRAY['parking', 'usher'], 
    true, 1
),
(
    'David', 'Williams', 'david.williams@email.com', '555-0103', 'South Congregation',
    ARRAY['Elder'], 
    ARRAY['security', 'stage', 'sound'], 
    true, 1
),
(
    'Robert', 'Brown', 'robert.brown@email.com', '555-0104', 'East Congregation',
    ARRAY['Ministerial Servant'], 
    ARRAY['parking', 'literature'], 
    true, 1
),
(
    'James', 'Davis', 'james.davis@email.com', '555-0105', 'West Congregation',
    ARRAY['Regular Pioneer'], 
    ARRAY['usher', 'literature', 'cleaning'], 
    true, 1
)
ON CONFLICT DO NOTHING;

-- Insert sample event assignments
INSERT INTO event_attendants (
    event_id, attendant_id, assignment_role, assignment_details, 
    shift_start, shift_end, status, assigned_by
) VALUES 
(1, 1, 'security', 'Main entrance security coordinator', '09:00:00', '16:30:00', 'confirmed', 1),
(1, 2, 'parking', 'Parking lot attendant - north section', '08:30:00', '17:00:00', 'assigned', 1),
(1, 3, 'stage', 'Stage microphone attendant', '09:15:00', '16:15:00', 'confirmed', 1),
(2, 1, 'security', 'Security team leader', '08:30:00', '17:00:00', 'assigned', 1),
(2, 3, 'stage', 'Platform attendant', '09:00:00', '16:45:00', 'assigned', 1),
(2, 4, 'literature', 'Literature counter supervisor', '08:45:00', '17:15:00', 'assigned', 1)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE events IS 'Events management table for JW Attendant Scheduler';
COMMENT ON TABLE attendants IS 'Attendants/volunteers management table';
COMMENT ON TABLE event_attendants IS 'Junction table linking events with assigned attendants';

COMMENT ON COLUMN events.event_type IS 'Type of event: assembly, convention, circuit_overseer_visit, special_event, meeting, memorial, other';
COMMENT ON COLUMN events.status IS 'Event status: draft, published, cancelled, completed';
COMMENT ON COLUMN attendants.privileges IS 'Array of JW privileges/appointments';
COMMENT ON COLUMN attendants.skills IS 'Array of attendant skills/capabilities';
COMMENT ON COLUMN event_attendants.assignment_role IS 'Specific role assignment: parking, security, stage, usher, literature, cleaning, etc.';
COMMENT ON COLUMN event_attendants.status IS 'Assignment status: assigned, confirmed, declined, completed, no_show';

-- Grant permissions (adjust as needed for your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON events TO jw_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON attendants TO jw_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON event_attendants TO jw_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jw_app_user;
