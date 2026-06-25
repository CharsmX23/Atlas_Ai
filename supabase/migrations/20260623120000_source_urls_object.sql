-- Migration: convert source_urls from array to JSONB object
-- Run this in Supabase SQL Editor before deploying the backend update

-- Step 1: change column type to JSONB (existing array values become valid JSONB arrays)
ALTER TABLE businesses
  ALTER COLUMN source_urls TYPE JSONB
  USING source_urls::jsonb;

-- Step 2: reset any NULL values to empty object
UPDATE businesses
SET source_urls = '{}'::jsonb
WHERE source_urls IS NULL;

-- Step 3: convert any remaining legacy array values to empty object
-- (old rows that were stored as arrays won't have per-field keys anyway)
UPDATE businesses
SET source_urls = '{}'::jsonb
WHERE jsonb_typeof(source_urls) = 'array';
