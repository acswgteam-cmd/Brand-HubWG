-- Migration: Add file_metadata column to assets table
-- Run this in your Supabase SQL editor

ALTER TABLE assets ADD COLUMN IF NOT EXISTS file_metadata JSONB;

-- Optional: Add an index for faster queries if you filter by metadata fields
-- CREATE INDEX IF NOT EXISTS idx_assets_file_metadata ON assets USING gin(file_metadata);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND column_name = 'file_metadata';
