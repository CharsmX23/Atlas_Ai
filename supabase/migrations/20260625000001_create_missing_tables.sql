-- Consolidated catch-up migration: ensures required tables exist with safe defaults.
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- user_settings: key-value store for app preferences
CREATE TABLE IF NOT EXISTS user_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- projects: user-defined research collections
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  job_ids     UUID[]      DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add job_ids column to projects if it was created without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'job_ids'
  ) THEN
    ALTER TABLE projects ADD COLUMN job_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- Seed default settings so the app never errors on first load.
-- Uses display names matching the frontend ALL_SOURCES constant.
INSERT INTO user_settings (key, value) VALUES
  ('display_name',    '"Research Team"'),
  ('research_mode',   '"fast"'),
  ('cache_ttl',       '"6h"'),
  ('theme',           '"dark"'),
  ('default_sources', '["Google Search","Healthgrades","Yelp","LinkedIn","Yellow Pages","Facebook","BBB Verifier","Government License DB","Website Detail","Image Collector","Avvo / Justia","Quality Auditor"]')
ON CONFLICT (key) DO NOTHING;

-- Enable Realtime on tables that the frontend subscribes to
DO $$
BEGIN
  -- projects table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  END IF;

  -- user_settings table (for multi-tab sync)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
  END IF;
END $$;
