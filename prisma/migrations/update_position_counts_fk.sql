-- Drop the old foreign key constraint
ALTER TABLE "position_counts" DROP CONSTRAINT IF EXISTS "position_counts_positionId_fkey";

-- Add new foreign key constraint pointing to positions table
ALTER TABLE "position_counts" 
ADD CONSTRAINT "position_counts_positionId_fkey" 
FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
