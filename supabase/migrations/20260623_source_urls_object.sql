-- Migrate source_urls column from array to JSONB object.
-- This version is recorded in remote schema_migrations; SQL is idempotent.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'source_urls')
      IS DISTINCT FROM 'jsonb' THEN
    EXECUTE 'ALTER TABLE businesses ALTER COLUMN source_urls TYPE JSONB USING source_urls::jsonb';
  END IF;
END $$;
UPDATE businesses SET source_urls = '{}'::jsonb WHERE source_urls IS NULL;
UPDATE businesses SET source_urls = '{}'::jsonb WHERE jsonb_typeof(source_urls) = 'array';
