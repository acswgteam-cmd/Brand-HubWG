-- Migration: Add custom_thumbnail column to assets table
-- Run this in your Supabase SQL editor

ALTER TABLE assets ADD COLUMN IF NOT EXISTS custom_thumbnail TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND column_name = 'custom_thumbnail';
