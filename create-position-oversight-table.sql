-- APEX GUARDIAN: Position Oversight Assignments Table
-- Shift-independent oversight for positions
-- Supports smart assignment algorithm with oversight mapping

CREATE TABLE position_oversight_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  overseer_id UUID REFERENCES attendants(id) ON DELETE SET NULL,
  keyman_id UUID REFERENCES attendants(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one oversight record per position per event
  UNIQUE(position_id, event_id)
);

-- Indexes for performance and smart assignment algorithm
CREATE INDEX idx_position_oversight_event ON position_oversight_assignments(event_id);
CREATE INDEX idx_position_oversight_position ON position_oversight_assignments(position_id);
CREATE INDEX idx_position_oversight_overseer ON position_oversight_assignments(overseer_id);
CREATE INDEX idx_position_oversight_keyman ON position_oversight_assignments(keyman_id);

-- Comments for documentation
COMMENT ON TABLE position_oversight_assignments IS 'Position-specific oversight assignments independent of shifts';
COMMENT ON COLUMN position_oversight_assignments.position_id IS 'Position that needs oversight';
COMMENT ON COLUMN position_oversight_assignments.event_id IS 'Event context for the oversight assignment';
COMMENT ON COLUMN position_oversight_assignments.overseer_id IS 'Attendant assigned as overseer for this position';
COMMENT ON COLUMN position_oversight_assignments.keyman_id IS 'Attendant assigned as keyman for this position';
COMMENT ON COLUMN position_oversight_assignments.assigned_by IS 'User who made the oversight assignment';
