-- Attendant Table Consolidation Migration
-- This migration consolidates the attendants table into event_attendants

BEGIN;

-- Step 1: Add new columns to event_attendants table
ALTER TABLE event_attendants 
ADD COLUMN IF NOT EXISTS firstName VARCHAR(255),
ADD COLUMN IF NOT EXISTS lastName VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(255),
ADD COLUMN IF NOT EXISTS congregation VARCHAR(255),
ADD COLUMN IF NOT EXISTS isAvailable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS availabilityStatus VARCHAR(255) DEFAULT 'AVAILABLE',
ADD COLUMN IF NOT EXISTS formsOfService JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS servingAs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills JSONB,
ADD COLUMN IF NOT EXISTS preferredDepartments JSONB,
ADD COLUMN IF NOT EXISTS unavailableDates JSONB,
ADD COLUMN IF NOT EXISTS pinHash VARCHAR(255),
ADD COLUMN IF NOT EXISTS profileVerificationRequired BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profileVerifiedAt TIMESTAMP,
ADD COLUMN IF NOT EXISTS totalAssignments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS totalHours DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 2: Migrate data from attendants to event_attendants
UPDATE event_attendants 
SET 
    firstName = a.firstName,
    lastName = a.lastName,
    email = a.email,
    phone = a.phone,
    congregation = a.congregation,
    isAvailable = a.isAvailable,
    availabilityStatus = a.availabilityStatus,
    formsOfService = a.formsOfService,
    servingAs = a.servingAs,
    skills = a.skills,
    preferredDepartments = a.preferredDepartments,
    unavailableDates = a.unavailableDates,
    pinHash = a.pinHash,
    profileVerificationRequired = a.profileVerificationRequired,
    profileVerifiedAt = a.profileVerifiedAt,
    totalAssignments = a.totalAssignments,
    totalHours = a.totalHours,
    notes = a.notes
FROM attendants a
WHERE event_attendants.attendantId = a.id;

-- Step 3: Create temporary mapping table for ID updates
CREATE TEMP TABLE attendant_id_mapping AS
SELECT 
    a.id as old_attendant_id,
    ea.id as new_event_attendant_id,
    ea.eventId
FROM attendants a
JOIN event_attendants ea ON ea.attendantId = a.id;

-- Step 4: Update position_assignments to reference event_attendants
UPDATE position_assignments 
SET attendantId = m.new_event_attendant_id
FROM attendant_id_mapping m
WHERE position_assignments.attendantId = m.old_attendant_id
AND position_assignments.eventId = m.eventId;

-- Update keyman references
UPDATE position_assignments 
SET keymanId = m.new_event_attendant_id
FROM attendant_id_mapping m
WHERE position_assignments.keymanId = m.old_attendant_id
AND position_assignments.eventId = m.eventId;

-- Update overseer references
UPDATE position_assignments 
SET overseerId = m.new_event_attendant_id
FROM attendant_id_mapping m
WHERE position_assignments.overseerId = m.old_attendant_id
AND position_assignments.eventId = m.eventId;

-- Step 5: Update position_oversight_assignments
UPDATE position_oversight_assignments 
SET overseer_id = m.new_event_attendant_id
FROM attendant_id_mapping m
WHERE position_oversight_assignments.overseer_id = m.old_attendant_id
AND position_oversight_assignments.event_id = m.eventId;

UPDATE position_oversight_assignments 
SET keyman_id = m.new_event_attendant_id
FROM attendant_id_mapping m
WHERE position_oversight_assignments.keyman_id = m.old_attendant_id
AND position_oversight_assignments.event_id = m.eventId;

-- Step 6: Update document_publications
-- Create new publication records for each event the attendant is in
INSERT INTO document_publications (id, documentId, attendantId, publishedAt, viewedAt, downloadedAt)
SELECT 
    gen_random_uuid(),
    dp.documentId,
    m.new_event_attendant_id,
    dp.publishedAt,
    dp.viewedAt,
    dp.downloadedAt
FROM document_publications dp
JOIN attendant_id_mapping m ON dp.attendantId = m.old_attendant_id
ON CONFLICT (documentId, attendantId) DO NOTHING;

-- Step 7: Remove old document_publications that reference attendants table
DELETE FROM document_publications 
WHERE attendantId IN (SELECT id FROM attendants);

-- Step 8: Add constraints and indexes for new structure
-- Make required fields NOT NULL
ALTER TABLE event_attendants 
ALTER COLUMN firstName SET NOT NULL,
ALTER COLUMN lastName SET NOT NULL,
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN congregation SET NOT NULL;

-- Add unique constraint for email per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendants_email_event 
ON event_attendants(eventId, email);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_attendants_email ON event_attendants(email);
CREATE INDEX IF NOT EXISTS idx_event_attendants_event_active ON event_attendants(eventId, isActive);

-- Step 9: Drop foreign key constraints that reference attendants table
ALTER TABLE event_attendants DROP CONSTRAINT IF EXISTS event_attendants_attendantId_fkey;
ALTER TABLE event_attendants DROP CONSTRAINT IF EXISTS event_attendants_keymanId_fkey;
ALTER TABLE event_attendants DROP CONSTRAINT IF EXISTS event_attendants_overseerId_fkey;

-- Step 10: Remove attendantId columns from event_attendants
ALTER TABLE event_attendants 
DROP COLUMN IF EXISTS attendantId,
DROP COLUMN IF EXISTS keymanId,
DROP COLUMN IF EXISTS overseerId;

-- Step 11: Drop the attendants table (THIS IS IRREVERSIBLE!)
-- Uncomment the next line only after thorough testing
-- DROP TABLE IF EXISTS attendants CASCADE;

COMMIT;

-- Verification queries (run these after migration)
-- SELECT COUNT(*) as event_attendants_count FROM event_attendants;
-- SELECT COUNT(*) as position_assignments_count FROM position_assignments;
-- SELECT COUNT(*) as oversight_assignments_count FROM position_oversight_assignments;
-- SELECT COUNT(*) as document_publications_count FROM document_publications;
