-- Update EventType enum to match business requirements
-- Map existing values to new ones before changing enum

-- Update existing data to new enum values
UPDATE "events" SET "eventType" = 'CIRCUIT_ASSEMBLY' WHERE "eventType" = 'ASSEMBLY';
UPDATE "events" SET "eventType" = 'REGIONAL_CONVENTION' WHERE "eventType" = 'CONVENTION';
-- SPECIAL_EVENT stays the same
UPDATE "events" SET "eventType" = 'OTHER' WHERE "eventType" = 'MEETING';

-- Drop and recreate the enum with new values
ALTER TYPE "EventType" RENAME TO "EventType_old";
CREATE TYPE "EventType" AS ENUM ('CIRCUIT_ASSEMBLY', 'REGIONAL_CONVENTION', 'SPECIAL_EVENT', 'OTHER');

-- Update the column to use the new enum
ALTER TABLE "events" ALTER COLUMN "eventType" TYPE "EventType" USING "eventType"::text::"EventType";
ALTER TABLE "events" ALTER COLUMN "eventType" SET DEFAULT 'CIRCUIT_ASSEMBLY';

-- Drop the old enum
DROP TYPE "EventType_old";
