-- Update EventType enum to match business requirements
-- Need to create new enum first, then migrate data

-- Create new enum with updated values
CREATE TYPE "EventType_new" AS ENUM ('CIRCUIT_ASSEMBLY', 'REGIONAL_CONVENTION', 'SPECIAL_EVENT', 'OTHER');

-- Add temporary column with new enum type
ALTER TABLE "events" ADD COLUMN "eventType_new" "EventType_new";

-- Map existing values to new enum values
UPDATE "events" SET "eventType_new" = 'CIRCUIT_ASSEMBLY' WHERE "eventType" = 'ASSEMBLY';
UPDATE "events" SET "eventType_new" = 'REGIONAL_CONVENTION' WHERE "eventType" = 'CONVENTION';
UPDATE "events" SET "eventType_new" = 'SPECIAL_EVENT' WHERE "eventType" = 'SPECIAL_EVENT';
UPDATE "events" SET "eventType_new" = 'OTHER' WHERE "eventType" = 'MEETING';

-- Drop old column and rename new one
ALTER TABLE "events" DROP COLUMN "eventType";
ALTER TABLE "events" RENAME COLUMN "eventType_new" TO "eventType";

-- Set default and not null constraint
ALTER TABLE "events" ALTER COLUMN "eventType" SET DEFAULT 'CIRCUIT_ASSEMBLY';
ALTER TABLE "events" ALTER COLUMN "eventType" SET NOT NULL;

-- Drop old enum and rename new one
DROP TYPE "EventType";
ALTER TYPE "EventType_new" RENAME TO "EventType";
