-- Keep who had a badge after it is checked back in.

CREATE TABLE IF NOT EXISTS "lanyard_checkouts" (
  "id" TEXT NOT NULL,
  "lanyardId" TEXT NOT NULL,
  "checkedOutTo" TEXT NOT NULL,
  "phone" TEXT,
  "checkedOutAt" TIMESTAMP(3) NOT NULL,
  "checkedInAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lanyard_checkouts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lanyard_checkouts_lanyardId_fkey'
  ) THEN
    ALTER TABLE "lanyard_checkouts"
    ADD CONSTRAINT "lanyard_checkouts_lanyardId_fkey"
    FOREIGN KEY ("lanyardId") REFERENCES "lanyards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "lanyard_checkouts_lanyardId_checkedOutAt_idx"
  ON "lanyard_checkouts"("lanyardId", "checkedOutAt");
