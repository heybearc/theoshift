-- AlterTable
ALTER TABLE "event_attendant_associations" ADD COLUMN     "keymanId" TEXT,
ADD COLUMN     "overseerId" TEXT;

-- AddForeignKey
ALTER TABLE "event_attendant_associations" ADD CONSTRAINT "event_attendant_associations_overseerId_fkey" FOREIGN KEY ("overseerId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendant_associations" ADD CONSTRAINT "event_attendant_associations_keymanId_fkey" FOREIGN KEY ("keymanId") REFERENCES "attendants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
