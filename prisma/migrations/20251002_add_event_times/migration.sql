-- Add startTime and endTime columns to events table
ALTER TABLE "events" 
  ADD COLUMN "startTime" TEXT,
  ADD COLUMN "endTime" TEXT;
