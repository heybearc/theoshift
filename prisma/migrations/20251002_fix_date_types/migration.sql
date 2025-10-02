-- Fix date types: Use DATE instead of TIMESTAMP for date-only fields
-- This prevents timezone conversion issues

ALTER TABLE "events" 
  ALTER COLUMN "startDate" TYPE DATE USING "startDate"::DATE,
  ALTER COLUMN "endDate" TYPE DATE USING "endDate"::DATE;
