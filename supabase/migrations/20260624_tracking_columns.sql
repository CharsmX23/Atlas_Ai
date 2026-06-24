-- Migration: add tracking columns for search summary, data quality, and source scoring
-- Run in Supabase SQL Editor

-- research_jobs: dedicated columns for search summary metrics
ALTER TABLE research_jobs
  ADD COLUMN IF NOT EXISTS businesses_found           integer   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS businesses_verified        integer   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicates_removed         integer   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sources_searched           integer   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS research_duration_seconds  float8    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_quality               jsonb     DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_scores              jsonb     DEFAULT '{}'::jsonb;

-- businesses: is_verified flag + confidence_score as integer 0-100
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Convert confidence_score from float (0-1) to integer (0-100)
-- Existing rows stored ~0.72 etc → multiply by 100 first
ALTER TABLE businesses
  ALTER COLUMN confidence_score TYPE integer
  USING ROUND(
    CASE
      WHEN confidence_score <= 1 THEN confidence_score * 100
      ELSE confidence_score
    END
  )::integer;

-- Default for any future inserts missing the value
ALTER TABLE businesses
  ALTER COLUMN confidence_score SET DEFAULT 0;
