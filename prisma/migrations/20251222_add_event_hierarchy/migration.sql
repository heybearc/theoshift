-- Add parentEventId and departmentTemplateId to events table
ALTER TABLE "events" ADD COLUMN "parentEventId" TEXT;
ALTER TABLE "events" ADD COLUMN "departmentTemplateId" TEXT;

-- Add foreign key constraints
ALTER TABLE "events" ADD CONSTRAINT "events_parentEventId_fkey" 
  FOREIGN KEY ("parentEventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_departmentTemplateId_fkey" 
  FOREIGN KEY ("departmentTemplateId") REFERENCES "department_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "events_parentEventId_idx" ON "events"("parentEventId");
CREATE INDEX "events_departmentTemplateId_idx" ON "events"("departmentTemplateId");
