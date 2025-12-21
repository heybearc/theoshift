-- BACKWARD-COMPATIBLE MIGRATION
-- This migration adds new tables while keeping old ones functional
-- STANDBY will use new tables, LIVE continues with old tables

-- Phase 1: Create department templates table
CREATE TABLE "department_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "parentId" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "department_templates_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "department_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "department_templates_parentId_idx" ON "department_templates"("parentId");

-- Phase 2: Create event_departments table
CREATE TABLE "event_departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customSettings" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_departments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_departments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "department_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "event_departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "event_departments_eventId_name_key" ON "event_departments"("eventId", "name");
CREATE INDEX "event_departments_eventId_idx" ON "event_departments"("eventId");
CREATE INDEX "event_departments_parentId_idx" ON "event_departments"("parentId");

-- Phase 3: Create volunteers table (copy of attendants structure)
-- Keep attendants table for LIVE, create volunteers for STANDBY
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "availabilityStatus" TEXT DEFAULT 'AVAILABLE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "servingAs" JSONB DEFAULT '[]',
    "skills" JSONB,
    "preferredDepartments" JSONB,
    "unavailableDates" JSONB,
    "totalAssignments" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "congregation" TEXT NOT NULL,
    "formsOfService" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pinHash" TEXT,
    "profileVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "profileVerifiedAt" TIMESTAMP(3),
    CONSTRAINT "volunteers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "volunteers_userId_key" ON "volunteers"("userId");

-- Phase 4: Copy all attendants data to volunteers table
INSERT INTO "volunteers" 
SELECT * FROM "attendants";

-- Phase 5: Create event_volunteers table (new structure)
CREATE TABLE "event_volunteers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VOLUNTEER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedStationRanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_volunteers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_volunteers_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "volunteers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_volunteers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "event_departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "event_volunteers_eventId_volunteerId_departmentId_key" ON "event_volunteers"("eventId", "volunteerId", "departmentId");
CREATE INDEX "event_volunteers_eventId_idx" ON "event_volunteers"("eventId");
CREATE INDEX "event_volunteers_volunteerId_idx" ON "event_volunteers"("volunteerId");
CREATE INDEX "event_volunteers_departmentId_idx" ON "event_volunteers"("departmentId");

-- Phase 5: Insert department templates
INSERT INTO "department_templates" ("id", "name", "description", "parentId", "sortOrder", "updatedAt") VALUES
    ('dept-accounts', 'Accounts', 'Financial and accounting services', NULL, 1, CURRENT_TIMESTAMP),
    ('dept-attendants', 'Attendants', 'Seating and crowd management', NULL, 2, CURRENT_TIMESTAMP),
    ('dept-first-aid', 'First Aid', 'Medical assistance and first aid', NULL, 3, CURRENT_TIMESTAMP),
    ('dept-parking', 'Parking', 'Parking lot management and traffic control', NULL, 4, CURRENT_TIMESTAMP),
    ('dept-safety', 'Safety', 'Safety coordination and emergency response', NULL, 5, CURRENT_TIMESTAMP),
    ('dept-audio-video', 'Audio-Video', 'Audio and video production services', NULL, 6, CURRENT_TIMESTAMP),
    ('dept-audio-crew', 'Audio Crew', 'Audio equipment and sound management', 'dept-audio-video', 1, CURRENT_TIMESTAMP),
    ('dept-stage-crew', 'Stage Crew', 'Stage setup and platform management', 'dept-audio-video', 2, CURRENT_TIMESTAMP),
    ('dept-video-crew', 'Video Crew', 'Video recording and streaming', 'dept-audio-video', 3, CURRENT_TIMESTAMP),
    ('dept-baptism', 'Baptism', 'Baptism coordination and assistance', NULL, 7, CURRENT_TIMESTAMP),
    ('dept-cleaning', 'Cleaning', 'Facility cleaning and maintenance', NULL, 8, CURRENT_TIMESTAMP),
    ('dept-info-volunteer', 'Information & Volunteer Service', 'Information desk and volunteer coordination', NULL, 9, CURRENT_TIMESTAMP),
    ('dept-installation', 'Installation', 'Equipment installation and setup', NULL, 10, CURRENT_TIMESTAMP),
    ('dept-lost-found', 'Lost & Found', 'Lost and found item management', NULL, 11, CURRENT_TIMESTAMP),
    ('dept-rooming', 'Rooming Desk', 'Accommodation and rooming coordination', NULL, 12, CURRENT_TIMESTAMP),
    ('dept-trucking', 'Trucking', 'Transportation and logistics', NULL, 13, CURRENT_TIMESTAMP);

-- Phase 6: Create event_departments for all existing events (copy from templates)
INSERT INTO "event_departments" ("id", "eventId", "templateId", "name", "description", "parentId", "sortOrder", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    e.id,
    dt.id,
    dt.name,
    dt.description,
    CASE 
        WHEN dt."parentId" IS NOT NULL THEN (
            SELECT ed.id 
            FROM "event_departments" ed 
            WHERE ed."eventId" = e.id 
            AND ed."templateId" = dt."parentId"
        )
        ELSE NULL
    END,
    dt."sortOrder",
    CURRENT_TIMESTAMP
FROM "events" e
CROSS JOIN "department_templates" dt
WHERE dt."parentId" IS NULL;

-- Insert child departments (Audio-Video sub-departments)
INSERT INTO "event_departments" ("id", "eventId", "templateId", "name", "description", "parentId", "sortOrder", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    e.id,
    dt.id,
    dt.name,
    dt.description,
    (
        SELECT ed.id 
        FROM "event_departments" ed 
        WHERE ed."eventId" = e.id 
        AND ed."templateId" = dt."parentId"
    ),
    dt."sortOrder",
    CURRENT_TIMESTAMP
FROM "events" e
CROSS JOIN "department_templates" dt
WHERE dt."parentId" IS NOT NULL;

-- Phase 7: Migrate event_attendants to event_volunteers
-- Link all existing attendants to "Attendants" department
INSERT INTO "event_volunteers" ("id", "eventId", "volunteerId", "departmentId", "role", "isActive", "assignedStationRanges", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    ea."eventId",
    ea."attendantId",
    (
        SELECT ed.id 
        FROM "event_departments" ed 
        WHERE ed."eventId" = ea."eventId" 
        AND ed.name = 'Attendants'
        LIMIT 1
    ),
    CASE 
        WHEN ea.role = 'ADMIN' THEN 'ADMIN'
        WHEN ea.role = 'OVERSEER' THEN 'OVERSEER'
        WHEN ea.role = 'ASSISTANT_OVERSEER' THEN 'ASSISTANT_OVERSEER'
        WHEN ea.role = 'KEYMAN' THEN 'KEYMAN'
        ELSE 'VOLUNTEER'
    END,
    ea."isActive",
    ea."assignedStationRanges",
    ea."createdAt",
    ea."updatedAt"
FROM "event_attendants" ea
WHERE ea."attendantId" IS NOT NULL;

-- Phase 8: Keep old tables intact for LIVE environment
-- DO NOT rename columns or drop tables yet
-- This allows LIVE to continue working while STANDBY uses new structure

-- Note: After release and sync, we'll run a cleanup migration to:
-- 1. Drop attendants table
-- 2. Drop event_attendants table  
-- 3. Update any remaining foreign key references if needed
