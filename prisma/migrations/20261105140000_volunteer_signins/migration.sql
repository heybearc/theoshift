ALTER TABLE "volunteers" ADD COLUMN "sessionValidAfter" TIMESTAMP(3);

CREATE TABLE "volunteer_signins" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "volunteer_signins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "volunteer_signins_volunteerId_idx" ON "volunteer_signins"("volunteerId");

ALTER TABLE "volunteer_signins" ADD CONSTRAINT "volunteer_signins_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
