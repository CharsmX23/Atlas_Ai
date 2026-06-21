/*
# Create backend-required tables

The FastAPI backend writes to these three tables but they were missing
from the original schema.  This migration adds them.

1. New Tables
  - `research_jobs`  — tracks each research query lifecycle
  - `businesses`     — individual business results linked to a job
  - `agent_events`   — timeline events emitted during research

2. Security
  - RLS enabled on all tables.
  - Public (anon) read access for the frontend.
  - Service-role writes are implicitly allowed (bypass RLS).
  - Authenticated users can also insert/update for future auth support.
*/

-- ─── research_jobs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.research_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query       text NOT NULL,
  mode        text NOT NULL DEFAULT 'deep',
  status      text NOT NULL DEFAULT 'pending',
  stats       jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read research_jobs" ON public.research_jobs;
CREATE POLICY "Public read research_jobs"
  ON public.research_jobs FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated write research_jobs" ON public.research_jobs;
CREATE POLICY "Authenticated write research_jobs"
  ON public.research_jobs FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_research_jobs_status
  ON public.research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_created
  ON public.research_jobs(created_at DESC);


-- ─── businesses ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               uuid NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  rank                 int NOT NULL DEFAULT 0,
  business_name        text NOT NULL,
  website              text DEFAULT '',
  source_urls          jsonb DEFAULT '[]',
  source_count         int DEFAULT 0,
  confidence_score     float DEFAULT 0,
  verification_status  text DEFAULT 'partial',
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read businesses" ON public.businesses;
CREATE POLICY "Public read businesses"
  ON public.businesses FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated write businesses" ON public.businesses;
CREATE POLICY "Authenticated write businesses"
  ON public.businesses FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_businesses_job_id
  ON public.businesses(job_id);
CREATE INDEX IF NOT EXISTS idx_businesses_rank
  ON public.businesses(job_id, rank);


-- ─── agent_events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  title       text NOT NULL,
  subtitle    text DEFAULT '',
  status      text DEFAULT 'done',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read agent_events" ON public.agent_events;
CREATE POLICY "Public read agent_events"
  ON public.agent_events FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated write agent_events" ON public.agent_events;
CREATE POLICY "Authenticated write agent_events"
  ON public.agent_events FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_events_job_id
  ON public.agent_events(job_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created
  ON public.agent_events(job_id, created_at);
