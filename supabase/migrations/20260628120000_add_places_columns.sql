-- Add columns required by the 3-stage Places pipeline.
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS).
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS place_id TEXT  DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT  DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviews  JSONB DEFAULT '[]'::jsonb;
