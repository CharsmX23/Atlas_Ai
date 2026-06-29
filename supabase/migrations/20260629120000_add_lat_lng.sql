-- Add lat/lng columns for map pin rendering.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
