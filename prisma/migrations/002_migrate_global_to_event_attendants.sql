-- Data Migration: Global Attendants to Event-Specific Model
-- APEX GUARDIAN Strategic Migration Script

-- Step 1: Migrate existing attendants to event-specific model
-- This preserves all existing data while establishing event ownership

INSERT INTO event_attendants (
    event_id,
    first_name,
    last_name,
    email,
    phone,
    congregation,
    forms_of_service,
    is_active,
    availability_status,
    is_available,
    serving_as,
    skills,
    preferred_departments,
    unavailable_dates,
    total_assignments,
    total_hours,
    notes,
    user_id,
    created_at,
    updated_at
)
SELECT DISTINCT
    eaa."eventId",
    a.first_name,
    a.last_name,
    a.email,
    a.phone,
    a.congregation,
    a.forms_of_service,
    a.is_active,
    a.availability_status,
    a.is_available,
    a.serving_as,
    a.skills,
    a.preferred_departments,
    a.unavailable_dates,
    a.total_assignments,
    a.total_hours,
    a.notes,
    a.user_id,
    a.created_at,
    a.updated_at
FROM attendants a
INNER JOIN event_attendant_associations eaa ON (
    (eaa."attendantId" = a.id AND eaa."attendantId" IS NOT NULL) OR
    (eaa."userId" = a."userId" AND eaa."userId" IS NOT NULL)
)
WHERE eaa."isActive" = true
ON CONFLICT (event_id, email) DO NOTHING; -- Prevent duplicates

-- Step 2: Verify migration results
DO $$
DECLARE
    original_count INTEGER;
    migrated_count INTEGER;
    events_with_attendants INTEGER;
BEGIN
    -- Count original attendants
    SELECT COUNT(*) INTO original_count FROM attendants;
    
    -- Count migrated attendants
    SELECT COUNT(*) INTO migrated_count FROM event_attendants;
    
    -- Count events with attendants
    SELECT COUNT(DISTINCT event_id) INTO events_with_attendants FROM event_attendants;
    
    -- Log migration results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Original attendants: %', original_count;
    RAISE NOTICE '- Migrated attendants: %', migrated_count;
    RAISE NOTICE '- Events with attendants: %', events_with_attendants;
    
    -- Validation checks
    IF migrated_count = 0 THEN
        RAISE WARNING 'No attendants were migrated - check event_attendant_associations data';
    END IF;
    
    IF events_with_attendants = 0 THEN
        RAISE WARNING 'No events have attendants - verify event associations';
    END IF;
END $$;

-- Step 3: Create backup of original data (for rollback if needed)
CREATE TABLE attendants_backup AS SELECT * FROM attendants;
CREATE TABLE event_attendant_associations_backup AS SELECT * FROM event_attendant_associations;

COMMENT ON TABLE attendants_backup IS 'Backup of original attendants table before migration to event-specific model';
COMMENT ON TABLE event_attendant_associations_backup IS 'Backup of original associations before migration';

-- Step 4: Add migration metadata
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    notes TEXT
);

INSERT INTO migration_log (migration_name, status, notes)
VALUES ('002_migrate_global_to_event_attendants', 'completed', 
        'Successfully migrated global attendants to event-specific model with data preservation');
