-- Migration: Enhance attendants schema with congregation and forms of service
-- Date: 2025-01-04
-- Description: Add congregation field to users and attendants tables, enhance attendants with forms of service

-- Add congregation field to users table
ALTER TABLE users ADD COLUMN congregation VARCHAR(255);

-- Enhance attendants table
-- Make required fields NOT NULL (with default values for existing records)
UPDATE attendants SET firstName = 'Unknown' WHERE firstName IS NULL;
UPDATE attendants SET lastName = 'Unknown' WHERE lastName IS NULL;
UPDATE attendants SET email = 'unknown@example.com' WHERE email IS NULL;
UPDATE attendants SET congregation = 'Unknown' WHERE congregation IS NULL;

ALTER TABLE attendants 
  ALTER COLUMN firstName SET NOT NULL,
  ALTER COLUMN lastName SET NOT NULL,
  ALTER COLUMN email SET NOT NULL;

-- Add new required fields to attendants
ALTER TABLE attendants ADD COLUMN congregation VARCHAR(255) NOT NULL DEFAULT 'Unknown';
ALTER TABLE attendants ADD COLUMN formsOfService JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Rename isAvailable to isActive for consistency
ALTER TABLE attendants ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT true;
UPDATE attendants SET isActive = isAvailable WHERE isAvailable IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN attendants.congregation IS 'Congregation the attendant belongs to';
COMMENT ON COLUMN attendants.formsOfService IS 'Array of forms of service: Elder, Ministerial Servant, Exemplary, Regular Pioneer, Other Department';
COMMENT ON COLUMN attendants.isActive IS 'Whether the attendant is currently active for assignments';
COMMENT ON COLUMN users.congregation IS 'Congregation the user belongs to';

-- Create index for better performance on congregation searches
CREATE INDEX IF NOT EXISTS idx_attendants_congregation ON attendants(congregation);
CREATE INDEX IF NOT EXISTS idx_users_congregation ON users(congregation);
CREATE INDEX IF NOT EXISTS idx_attendants_active ON attendants(isActive);
