-- Group counts from a volunteer sign-in have no staff user id.
-- Keep the volunteer who submitted so the count list can show a name.

ALTER TABLE "count_group_entries" ADD COLUMN IF NOT EXISTS "enteredByVolunteerId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'count_group_entries_enteredByVolunteerId_fkey'
  ) THEN
    ALTER TABLE "count_group_entries"
    ADD CONSTRAINT "count_group_entries_enteredByVolunteerId_fkey"
    FOREIGN KEY ("enteredByVolunteerId") REFERENCES "volunteers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "count_group_entries_enteredByVolunteerId_idx"
  ON "count_group_entries"("enteredByVolunteerId");
