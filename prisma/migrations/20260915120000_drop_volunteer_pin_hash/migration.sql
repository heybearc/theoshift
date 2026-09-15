-- Drop unused volunteer PIN hashes (magic-link login only).
ALTER TABLE "volunteers" DROP COLUMN IF EXISTS "pinHash";
