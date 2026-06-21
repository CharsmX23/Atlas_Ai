/*
# Create agent_registry table

1. New Tables
- `agent_registry`
- `id` (uuid, primary key) - Unique identifier
- `name` (text, not null) - Agent name (e.g., "Google Search Agent")
- `source` (text, not null) - Data source (e.g., "google.com")
- `description` (text, not null) - What the agent does
- `status` (text, not null) - Agent status: online, degraded, offline
- `reliability` (int) - Reliability score (0-100)
- `jobs` (int, default 0) - Number of jobs completed
- `latency_ms` (int, default 0) - Average latency in milliseconds
- `domain` (text) - Source domain
- `icon` (text) - Icon name (lucide-react icon)
- `icon_color` (text) - Hex color for the icon
- `created_at` (timestamptz, default now()) - Creation timestamp
- `updated_at` (timestamptz, default now()) - Last update timestamp

2. Security
- Enable RLS on `agent_registry`.
- Allow public read access (no auth needed for now - the app is public).
- Allow authenticated users to insert/update/delete.
*/

CREATE TABLE IF NOT EXISTS public.agent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'offline',
  reliability int NOT NULL DEFAULT 0,
  jobs int NOT NULL DEFAULT 0,
  latency_ms int NOT NULL DEFAULT 0,
  domain text,
  icon text,
  icon_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
DROP POLICY IF EXISTS "Allow public read access" ON public.agent_registry;
CREATE POLICY "Allow public read access"
ON public.agent_registry FOR SELECT
TO anon, authenticated
USING (true);

-- Create policies for authenticated insert/update/delete
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.agent_registry;
CREATE POLICY "Allow authenticated insert"
ON public.agent_registry FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.agent_registry;
CREATE POLICY "Allow authenticated update"
ON public.agent_registry FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.agent_registry;
CREATE POLICY "Allow authenticated delete"
ON public.agent_registry FOR DELETE
TO authenticated
USING (true);