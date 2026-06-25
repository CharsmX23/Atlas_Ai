CREATE TABLE IF NOT EXISTS user_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
