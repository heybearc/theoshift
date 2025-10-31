-- AlterTable
ALTER TABLE "user_activity" ADD COLUMN "serverNode" TEXT;

-- CreateIndex
CREATE INDEX "user_activity_serverNode_idx" ON "user_activity"("serverNode");
