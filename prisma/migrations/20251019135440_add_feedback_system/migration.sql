/*
  Warnings:

  - You are about to drop the `event_attendant_associations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'ENHANCEMENT', 'FEATURE');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "event_attendant_associations" DROP CONSTRAINT "event_attendant_associations_attendantId_fkey";

-- DropForeignKey
ALTER TABLE "event_attendant_associations" DROP CONSTRAINT "event_attendant_associations_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_attendant_associations" DROP CONSTRAINT "event_attendant_associations_keymanId_fkey";

-- DropForeignKey
ALTER TABLE "event_attendant_associations" DROP CONSTRAINT "event_attendant_associations_overseerId_fkey";

-- DropForeignKey
ALTER TABLE "event_attendant_associations" DROP CONSTRAINT "event_attendant_associations_userId_fkey";

-- DropForeignKey
ALTER TABLE "position_counts" DROP CONSTRAINT "position_counts_positionId_fkey";

-- AlterTable
ALTER TABLE "attendants" ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "profileVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "assemblyoverseeremail" TEXT,
ADD COLUMN     "assemblyoverseername" TEXT,
ADD COLUMN     "assemblyoverseerphone" TEXT,
ADD COLUMN     "attendantoverseerassistants" JSONB DEFAULT '[]',
ADD COLUMN     "attendantoverseeremail" TEXT,
ADD COLUMN     "attendantoverseername" TEXT,
ADD COLUMN     "attendantoverseerphone" TEXT,
ADD COLUMN     "circuitoverseeremail" TEXT,
ADD COLUMN     "circuitoverseername" TEXT,
ADD COLUMN     "circuitoverseerphone" TEXT;

-- DropTable
DROP TABLE "event_attendant_associations";

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

-- CreateIndex
CREATE UNIQUE INDEX "event_attendants_eventId_userId_key" ON "event_attendants"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendants_eventId_attendantId_key" ON "event_attendants"("eventId", "attendantId");

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
CREATE INDEX "idx_event_documents_event" ON "event_documents"("eventId");

-- CreateIndex
CREATE INDEX "idx_event_documents_uploader" ON "event_documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "idx_document_publications_document" ON "document_publications"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_publications_attendant" ON "document_publications"("attendantId");

-- CreateIndex
CREATE UNIQUE INDEX "document_publications_documentId_attendantId_key" ON "document_publications"("documentId", "attendantId");

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
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_publications" ADD CONSTRAINT "document_publications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "event_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_publications" ADD CONSTRAINT "document_publications_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "attendants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
