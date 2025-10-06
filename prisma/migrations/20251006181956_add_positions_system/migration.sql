/*
  Warnings:

  - You are about to drop the column `isActive` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `maxAttendants` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `shiftEnd` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `shiftName` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `shiftStart` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `position_shifts` table. All the data in the column will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[eventId,attendantId]` on the table `event_attendant_associations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `congregation` to the `attendants` table without a default value. This is not possible if the table is not empty.
  - Made the column `firstName` on table `attendants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `attendants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `attendants` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `name` to the `position_shifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `position_shifts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PositionRole" AS ENUM ('OVERSEER', 'KEYMAN', 'ATTENDANT');

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "count_sessions" DROP CONSTRAINT "count_sessions_eventId_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_eventId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_eventId_fkey";

-- DropForeignKey
ALTER TABLE "oversight_assignments" DROP CONSTRAINT "oversight_assignments_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "position_shifts" DROP CONSTRAINT "position_shifts_positionId_fkey";

-- DropForeignKey
ALTER TABLE "station_ranges" DROP CONSTRAINT "station_ranges_departmentId_fkey";

-- AlterTable
ALTER TABLE "attendants" ADD COLUMN     "congregation" TEXT NOT NULL,
ADD COLUMN     "formsOfService" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "count_sessions" ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploadedBy" TEXT;

-- AlterTable
ALTER TABLE "event_attendant_associations" ADD COLUMN     "attendantId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "position_shifts" DROP COLUMN "isActive",
DROP COLUMN "maxAttendants",
DROP COLUMN "notes",
DROP COLUMN "shiftEnd",
DROP COLUMN "shiftName",
DROP COLUMN "shiftStart",
DROP COLUMN "updatedAt",
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "congregation" TEXT;

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "documents";

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

-- CreateIndex
CREATE INDEX "positions_eventId_sequence_idx" ON "positions"("eventId", "sequence");

-- CreateIndex
CREATE INDEX "positions_eventId_isActive_idx" ON "positions"("eventId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "positions_eventId_positionNumber_key" ON "positions"("eventId", "positionNumber");

-- CreateIndex
CREATE INDEX "position_assignments_positionId_shiftId_idx" ON "position_assignments"("positionId", "shiftId");

-- CreateIndex
CREATE INDEX "position_assignments_attendantId_idx" ON "position_assignments"("attendantId");

-- CreateIndex
CREATE INDEX "position_assignments_role_idx" ON "position_assignments"("role");

-- CreateIndex
CREATE INDEX "position_assignments_overseerId_keymanId_idx" ON "position_assignments"("overseerId", "keymanId");

-- CreateIndex
CREATE UNIQUE INDEX "position_assignments_positionId_shiftId_attendantId_key" ON "position_assignments"("positionId", "shiftId", "attendantId");

-- CreateIndex
CREATE INDEX "shift_templates_isSystemTemplate_idx" ON "shift_templates"("isSystemTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendant_associations_eventId_attendantId_key" ON "event_attendant_associations"("eventId", "attendantId");

-- CreateIndex
CREATE INDEX "position_shifts_positionId_idx" ON "position_shifts"("positionId");

-- CreateIndex
CREATE INDEX "position_shifts_positionId_sequence_idx" ON "position_shifts"("positionId", "sequence");

-- AddForeignKey
ALTER TABLE "count_sessions" ADD CONSTRAINT "count_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendant_associations" ADD CONSTRAINT "event_attendant_associations_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "attendants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_shifts" ADD CONSTRAINT "position_shifts_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "position_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "attendants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_overseerId_fkey" FOREIGN KEY ("overseerId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_keymanId_fkey" FOREIGN KEY ("keymanId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
