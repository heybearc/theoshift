-- Event-Specific Attendants Migration
-- APEX GUARDIAN Strategic Refactor: Move from global to event-specific attendant model

-- Create event_attendants table with proper constraints and indexes
CREATE TABLE event_attendants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- JW-Specific Fields
    congregation VARCHAR(200) NOT NULL,
    forms_of_service JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Status and Availability
    is_active BOOLEAN NOT NULL DEFAULT true,
    availability_status VARCHAR(50) DEFAULT 'available',
    is_available BOOLEAN NOT NULL DEFAULT true,
    
    -- Service Information
    serving_as VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    preferred_departments JSONB DEFAULT '[]'::jsonb,
    unavailable_dates JSONB DEFAULT '[]'::jsonb,
    
    -- Statistics
    total_assignments INTEGER DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0.00,
    
    -- Administrative
    notes TEXT,
    user_id UUID, -- Optional link to users table for account holders
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_event_attendants_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_attendants_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_event_attendant_email 
        UNIQUE (event_id, email),
    CONSTRAINT valid_email 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_forms_of_service 
        CHECK (jsonb_typeof(forms_of_service) = 'array')
);

-- Indexes for performance
CREATE INDEX idx_event_attendants_event_id ON event_attendants(event_id);
CREATE INDEX idx_event_attendants_email ON event_attendants(email);
CREATE INDEX idx_event_attendants_congregation ON event_attendants(congregation);
CREATE INDEX idx_event_attendants_is_active ON event_attendants(is_active);
CREATE INDEX idx_event_attendants_user_id ON event_attendants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_attendants_forms_of_service ON event_attendants USING GIN(forms_of_service);

-- Full-text search index for names
CREATE INDEX idx_event_attendants_name_search ON event_attendants 
    USING GIN(to_tsvector('english', first_name || ' ' || last_name));

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_event_attendants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_attendants_updated_at
    BEFORE UPDATE ON event_attendants
    FOR EACH ROW
    EXECUTE FUNCTION update_event_attendants_updated_at();

-- Comments for documentation
COMMENT ON TABLE event_attendants IS 'Event-specific attendant records - each event maintains its own attendant roster';
COMMENT ON COLUMN event_attendants.event_id IS 'Foreign key to events table - establishes event ownership';
COMMENT ON COLUMN event_attendants.forms_of_service IS 'JSON array of service forms: Elder, Ministerial Servant, etc.';
COMMENT ON COLUMN event_attendants.skills IS 'JSON array of attendant skills and capabilities';
COMMENT ON COLUMN event_attendants.preferred_departments IS 'JSON array of preferred department assignments';
COMMENT ON COLUMN event_attendants.unavailable_dates IS 'JSON array of dates when attendant is unavailable';
