-- Positions Management System
-- APEX GUARDIAN: Event-scoped position management with flexible shifts

-- Core positions table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    position_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL, -- "Position 1" initially, then customized
    description TEXT, -- Custom descriptive label
    area VARCHAR(100), -- Optional grouping (Auditorium, Dining, Lobby, etc.)
    sequence INTEGER NOT NULL, -- For ordering/display
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(event_id, position_number),
    INDEX idx_positions_event_sequence (event_id, sequence),
    INDEX idx_positions_event_active (event_id, is_active)
);

-- Position shifts - flexible time management
CREATE TABLE position_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- "All Day", "9:50 to 10", "Morning", etc.
    start_time TIME, -- NULL for "All Day" shifts
    end_time TIME, -- NULL for "All Day" shifts
    is_all_day BOOLEAN DEFAULT false,
    sequence INTEGER NOT NULL, -- For ordering shifts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_shifts_position (position_id),
    INDEX idx_shifts_position_sequence (position_id, sequence)
);

-- Position assignments with proper hierarchy
CREATE TABLE position_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES position_shifts(id) ON DELETE CASCADE,
    attendant_id UUID NOT NULL REFERENCES attendants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OVERSEER', 'KEYMAN', 'ATTENDANT')),
    overseer_id UUID REFERENCES attendants(id), -- Links Keymen to their Overseer
    keyman_id UUID REFERENCES attendants(id), -- Links Attendants to their Keyman
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    
    UNIQUE(position_id, shift_id, attendant_id), -- Prevent duplicate assignments
    INDEX idx_assignments_position_shift (position_id, shift_id),
    INDEX idx_assignments_attendant (attendant_id),
    INDEX idx_assignments_role (role),
    INDEX idx_assignments_hierarchy (overseer_id, keyman_id)
);

-- Bulk creation templates for common shift patterns
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- "Circuit Assembly Standard", "Regional Convention", etc.
    description TEXT,
    shifts JSONB NOT NULL, -- Array of shift definitions
    is_system_template BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_templates_system (is_system_template)
);

-- Insert default shift templates
INSERT INTO shift_templates (name, description, shifts, is_system_template) VALUES
('All Day', 'Single all-day shift', '[{"name": "All Day", "isAllDay": true}]', true),
('Circuit Assembly Standard', 'Standard CA shift pattern', '[
    {"name": "9:50 to 10", "startTime": "09:50", "endTime": "10:00"},
    {"name": "10 to 12", "startTime": "10:00", "endTime": "12:00"},
    {"name": "12 to 2", "startTime": "12:00", "endTime": "14:00"},
    {"name": "2 to 5", "startTime": "14:00", "endTime": "17:00"}
]', true),
('Morning/Afternoon', 'Simple two-shift pattern', '[
    {"name": "Morning", "startTime": "09:00", "endTime": "13:00"},
    {"name": "Afternoon", "startTime": "13:00", "endTime": "17:00"}
]', true),
('Three Hour Blocks', 'Standard 3-hour shifts', '[
    {"name": "9 to 12", "startTime": "09:00", "endTime": "12:00"},
    {"name": "12 to 3", "startTime": "12:00", "endTime": "15:00"},
    {"name": "3 to 6", "startTime": "15:00", "endTime": "18:00"}
]', true);
