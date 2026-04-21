-- Add content hash to documents for duplicate prevention
ALTER TABLE documents
  ADD COLUMN content_hash TEXT;

-- Backfill: existing rows get NULL (no hash known retroactively)
-- Apply unique constraint only after backfill to avoid conflicts
ALTER TABLE documents
  ADD CONSTRAINT documents_content_hash_unique UNIQUE (content_hash);
