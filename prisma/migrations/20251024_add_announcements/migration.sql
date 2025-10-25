-- CreateTable: announcements
-- Safe additive migration - zero impact on existing functionality

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "announcements_eventId_idx" ON "announcements"("eventId");
CREATE INDEX IF NOT EXISTS "announcements_isActive_idx" ON "announcements"("isActive");
CREATE INDEX IF NOT EXISTS "announcements_priority_idx" ON "announcements"("priority");

-- AddForeignKey
ALTER TABLE "announcements" 
  ADD CONSTRAINT "announcements_eventId_fkey" 
  FOREIGN KEY ("eventId") REFERENCES "events"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (optional, if createdBy references users)
ALTER TABLE "announcements" 
  ADD CONSTRAINT "announcements_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON TABLE "announcements" TO jw_scheduler;
