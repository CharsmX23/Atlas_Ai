/*
# Fix schema — add all PDF-required fields to businesses table
  and enable Supabase Realtime on the three backend tables.

Run this against your Supabase project after the initial migration.
*/

-- ── Add missing columns to businesses ────────────────────────────────────────
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address          text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone            text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email            text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS working_hours    text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rating           text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS review_count     text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS services         text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS specialties      text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS license_info     text DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS certifications   text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS awards           text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS social_profiles  text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS images_urls      text[] DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS has_conflict     boolean DEFAULT FALSE;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS conflict_data    jsonb;

-- source_urls was created as jsonb DEFAULT '[]' in the base migration — no change needed.

-- ── Enable Supabase Realtime on the three backend tables ─────────────────────
-- The frontend subscribes to INSERT events on these tables to drive the
-- real-time timeline and live result streaming.

DO $$
BEGIN
  -- agent_events: each INSERT is a timeline step
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
  END IF;

  -- businesses: each INSERT is a new business result
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'businesses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  END IF;

  -- research_jobs: UPDATE to status='complete' signals the frontend to transition
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'research_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.research_jobs;
  END IF;
END $$;
