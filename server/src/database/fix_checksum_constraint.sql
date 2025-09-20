
-- Drop the existing unique constraint
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_checksum_sha256_key;

-- Drop the old index
DROP INDEX IF EXISTS idx_files_checksum_sha256_unique;

-- Create a new unique constraint that includes user_id
ALTER TABLE files ADD CONSTRAINT files_checksum_user_unique UNIQUE(checksum_sha256, user_id);

-- Create a new index for better performance
CREATE INDEX IF NOT EXISTS idx_files_checksum_user ON files(checksum_sha256, user_id);

-- Verify the changes
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'files'::regclass 
AND conname LIKE '%checksum%';
