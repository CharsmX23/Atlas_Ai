-- Migration: create projects table for user-defined research collections
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Realtime so frontend receives live INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
