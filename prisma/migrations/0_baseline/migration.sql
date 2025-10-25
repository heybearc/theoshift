-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CountSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentAccessLevel" AS ENUM ('PUBLIC', 'ATTENDANTS_ONLY', 'LEADERSHIP_ONLY', 'DEPARTMENT_SPECIFIC', 'POSITION_SPECIFIC', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('EMERGENCY_INFO', 'POSITION_INSTRUCTIONS', 'EVENT_DOCUMENTATION', 'TRAINING_MATERIALS', 'ANNOUNCEMENTS', 'FORMS', 'REPORTS', 'OTHER');

-- CreateEnum
CREATE TYPE "EventPermissionRole" AS ENUM ('OWNER', 'MANAGER', 'OVERSEER', 'KEYMAN', 'VIEWER');

-- CreateEnum
CREATE TYPE "EventScopeType" AS ENUM ('DEPARTMENT', 'STATION_RANGE', 'POSITION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'CURRENT', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CIRCUIT_ASSEMBLY', 'REGIONAL_CONVENTION', 'SPECIAL_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERIENCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'ENHANCEMENT', 'FEATURE');

-- CreateEnum
CREATE TYPE "LanyardStatus" AS ENUM ('AVAILABLE', 'CHECKED_OUT', 'LOST', 'DAMAGED', 'RETIRED');

-- CreateEnum
CREATE TYPE "OversightLevel" AS ENUM ('OVERSEER', 'ASSISTANT_OVERSEER', 'DEPARTMENT_HEAD', 'STATION_OVERSEER');

-- CreateEnum
CREATE TYPE "PositionRole" AS ENUM ('OVERSEER', 'KEYMAN', 'ATTENDANT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT DEFAULT 'INFO',
    "isActive" BOOLEAN DEFAULT true,
    "startDate" TIMESTAMP(6),
    "endDate" TIMESTAMP(6),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "shiftId" TEXT,
    "shiftStart" TIMESTAMP(3) NOT NULL,
    "shiftEnd" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendants" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
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

    CONSTRAINT "attendants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "count_sessions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "countTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "CountSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,

    CONSTRAINT "count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_publications" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),

    CONSTRAINT "document_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_configurations" (
    "id" TEXT NOT NULL,
    "smtpServer" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpUser" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "replyToEmail" TEXT,
    "inviteTemplate" TEXT,
    "assignmentTemplate" TEXT,
    "reminderTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ATTENDANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedDepartments" JSONB,
    "assignedStationRanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendantId" TEXT,
    "keymanId" TEXT,
    "overseerId" TEXT,

    CONSTRAINT "event_attendants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_documents" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedTo" TEXT NOT NULL DEFAULT 'none',
    "publishedCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" "EventPermissionRole" NOT NULL DEFAULT 'VIEWER',
    "scopeType" "EventScopeType",
    "scopeIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_positions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "positionNumber" INTEGER NOT NULL,
    "positionName" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "isLeadershipPosition" BOOLEAN NOT NULL DEFAULT false,
    "requiresExperience" BOOLEAN NOT NULL DEFAULT false,
    "maxAttendants" INTEGER NOT NULL DEFAULT 1,
    "minAttendants" INTEGER NOT NULL DEFAULT 1,
    "tags" JSONB,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "location" TEXT,
    "venue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'CIRCUIT_ASSEMBLY',
    "attendantsNeeded" INTEGER,
    "capacity" INTEGER,
    "assemblyoverseeremail" TEXT,
    "assemblyoverseername" TEXT,
    "assemblyoverseerphone" TEXT,
    "attendantoverseerassistants" JSONB DEFAULT '[]',
    "attendantoverseeremail" TEXT,
    "attendantoverseername" TEXT,
    "attendantoverseerphone" TEXT,
    "circuitoverseeremail" TEXT,
    "circuitoverseername" TEXT,
    "circuitoverseerphone" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_attachments" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_comments" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lanyard_settings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "totalLanyards" INTEGER NOT NULL,
    "availableLanyards" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lanyard_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lanyards" (
    "id" TEXT NOT NULL,
    "lanyardSettingId" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "isCheckedOut" BOOLEAN NOT NULL DEFAULT false,
    "checkedOutTo" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "status" "LanyardStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lanyards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oversight_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "stationRangeId" TEXT,
    "oversightLevel" "OversightLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oversight_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_assignments" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "shiftId" TEXT,
    "attendantId" TEXT NOT NULL,
    "role" "PositionRole" NOT NULL,
    "overseerId" TEXT,
    "keymanId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "position_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_counts" (
    "id" TEXT NOT NULL,
    "countSessionId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "attendeeCount" INTEGER,
    "notes" TEXT,
    "countedBy" TEXT,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_oversight_assignments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "position_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "overseer_id" TEXT,
    "keyman_id" TEXT,
    "assigned_by" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_oversight_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_shifts" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TEXT,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startTime" TEXT,

    CONSTRAINT "position_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "positionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT,
    "sequence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shifts" JSONB NOT NULL,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_ranges" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startStation" INTEGER NOT NULL,
    "endStation" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "UserRole" NOT NULL DEFAULT 'ATTENDANT',
    "passwordHash" TEXT,
    "inviteToken" TEXT,
    "inviteExpiry" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "congregation" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "announcements_enddate_idx" ON "announcements"("endDate");

-- CreateIndex
CREATE INDEX "announcements_eventid_idx" ON "announcements"("eventId");

-- CreateIndex
CREATE INDEX "announcements_isactive_idx" ON "announcements"("isActive");

-- CreateIndex
CREATE INDEX "announcements_startdate_idx" ON "announcements"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendants_userId_key" ON "attendants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "count_sessions_eventId_sessionName_key" ON "count_sessions"("eventId", "sessionName");

-- CreateIndex
CREATE INDEX "idx_document_publications_attendant" ON "document_publications"("attendantId");

-- CreateIndex
CREATE INDEX "idx_document_publications_document" ON "document_publications"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_publications_documentId_attendantId_key" ON "document_publications"("documentId", "attendantId");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendants_eventId_attendantId_key" ON "event_attendants"("eventId", "attendantId");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendants_eventId_userId_key" ON "event_attendants"("eventId", "userId");

-- CreateIndex
CREATE INDEX "idx_event_documents_event" ON "event_documents"("eventId");

-- CreateIndex
CREATE INDEX "idx_event_documents_uploader" ON "event_documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "event_permissions_eventId_idx" ON "event_permissions"("eventId");

-- CreateIndex
CREATE INDEX "event_permissions_eventId_role_idx" ON "event_permissions"("eventId", "role");

-- CreateIndex
CREATE INDEX "event_permissions_userId_idx" ON "event_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_permissions_userId_eventId_key" ON "event_permissions"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_positions_eventId_positionNumber_key" ON "event_positions"("eventId", "positionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "lanyard_settings_eventId_key" ON "lanyard_settings"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "lanyards_lanyardSettingId_badgeNumber_key" ON "lanyards"("lanyardSettingId", "badgeNumber");

-- CreateIndex
CREATE INDEX "position_assignments_attendantId_idx" ON "position_assignments"("attendantId");

-- CreateIndex
CREATE INDEX "position_assignments_overseerId_keymanId_idx" ON "position_assignments"("overseerId", "keymanId");

-- CreateIndex
CREATE INDEX "position_assignments_positionId_shiftId_idx" ON "position_assignments"("positionId", "shiftId");

-- CreateIndex
CREATE INDEX "position_assignments_role_idx" ON "position_assignments"("role");

-- CreateIndex
CREATE UNIQUE INDEX "position_assignments_positionId_shiftId_attendantId_key" ON "position_assignments"("positionId", "shiftId", "attendantId");

-- CreateIndex
CREATE UNIQUE INDEX "position_counts_countSessionId_positionId_key" ON "position_counts"("countSessionId", "positionId");

-- CreateIndex
CREATE INDEX "idx_position_oversight_event" ON "position_oversight_assignments"("event_id");

-- CreateIndex
CREATE INDEX "idx_position_oversight_keyman" ON "position_oversight_assignments"("keyman_id");

-- CreateIndex
CREATE INDEX "idx_position_oversight_overseer" ON "position_oversight_assignments"("overseer_id");

-- CreateIndex
CREATE INDEX "idx_position_oversight_position" ON "position_oversight_assignments"("position_id");

-- CreateIndex
CREATE UNIQUE INDEX "position_oversight_assignments_position_id_event_id_key" ON "position_oversight_assignments"("position_id", "event_id");

-- CreateIndex
CREATE INDEX "position_shifts_positionId_idx" ON "position_shifts"("positionId");

-- CreateIndex
CREATE INDEX "position_shifts_positionId_sequence_idx" ON "position_shifts"("positionId", "sequence");

-- CreateIndex
CREATE INDEX "positions_eventId_isActive_idx" ON "positions"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "positions_eventId_sequence_idx" ON "positions"("eventId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "positions_eventId_positionNumber_key" ON "positions"("eventId", "positionNumber");

-- CreateIndex
CREATE INDEX "shift_templates_isSystemTemplate_idx" ON "shift_templates"("isSystemTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_inviteToken_key" ON "users"("inviteToken");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "event_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendants" ADD CONSTRAINT "attendants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_sessions" ADD CONSTRAINT "count_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_publications" ADD CONSTRAINT "document_publications_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "attendants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_publications" ADD CONSTRAINT "document_publications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "event_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "attendants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_keymanId_fkey" FOREIGN KEY ("keymanId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_overseerId_fkey" FOREIGN KEY ("overseerId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_permissions" ADD CONSTRAINT "event_permissions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_permissions" ADD CONSTRAINT "event_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_positions" ADD CONSTRAINT "event_positions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lanyard_settings" ADD CONSTRAINT "lanyard_settings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lanyards" ADD CONSTRAINT "lanyards_lanyardSettingId_fkey" FOREIGN KEY ("lanyardSettingId") REFERENCES "lanyard_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_assignments" ADD CONSTRAINT "oversight_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_assignments" ADD CONSTRAINT "oversight_assignments_stationRangeId_fkey" FOREIGN KEY ("stationRangeId") REFERENCES "station_ranges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oversight_assignments" ADD CONSTRAINT "oversight_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "attendants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_keymanId_fkey" FOREIGN KEY ("keymanId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_overseerId_fkey" FOREIGN KEY ("overseerId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "position_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_counts" ADD CONSTRAINT "position_counts_countSessionId_fkey" FOREIGN KEY ("countSessionId") REFERENCES "count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_counts" ADD CONSTRAINT "position_counts_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_oversight_assignments" ADD CONSTRAINT "position_oversight_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_oversight_assignments" ADD CONSTRAINT "position_oversight_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_oversight_assignments" ADD CONSTRAINT "position_oversight_assignments_keyman_id_fkey" FOREIGN KEY ("keyman_id") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_oversight_assignments" ADD CONSTRAINT "position_oversight_assignments_overseer_id_fkey" FOREIGN KEY ("overseer_id") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_oversight_assignments" ADD CONSTRAINT "position_oversight_assignments_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "position_shifts" ADD CONSTRAINT "position_shifts_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

