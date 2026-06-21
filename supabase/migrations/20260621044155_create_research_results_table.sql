/*
# Create research_results table

1. New Tables
- `research_results`
- `id` (uuid, primary key) - Unique identifier
- `query` (text, not null) - The search query
- `business_name` (text, not null) - Business name
- `address` (text) - Full address
- `phone` (text) - Phone number
- `email` (text) - Email address
- `website` (text) - Website URL
- `working_hours` (text) - Working hours
- `rating` (text) - Rating value
- `review_count` (text) - Number of reviews
- `services` (text[]) - Array of services
- `specialties` (text[]) - Array of specialties
- `license_info` (text) - License information
- `certifications` (text[]) - Array of certifications
- `awards` (text[]) - Array of awards
- `social_profiles` (text[]) - Array of social profiles
- `source_urls` (text[]) - Array of source URLs
- `confidence_score` (int) - Confidence score (0-100)
- `verification_status` (text) - verified, partial, conflict
- `source_count` (int) - Number of sources
- `status` (text, default 'pending') - pending, completed, failed
- `created_at` (timestamptz, default now()) - Creation timestamp
- `updated_at` (timestamptz, default now()) - Last update timestamp

2. Security
- Enable RLS on `research_results`.
- Allow public read access for viewing results.
- Allow authenticated users to insert/update/delete.
*/

CREATE TABLE IF NOT EXISTS public.research_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  business_name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  working_hours text,
  rating text,
  review_count text,
  services text[] DEFAULT '{}',
  specialties text[] DEFAULT '{}',
  license_info text,
  certifications text[] DEFAULT '{}',
  awards text[] DEFAULT '{}',
  social_profiles text[] DEFAULT '{}',
  source_urls text[] DEFAULT '{}',
  confidence_score int DEFAULT 0,
  verification_status text DEFAULT 'pending',
  source_count int DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
DROP POLICY IF EXISTS "Allow public read access" ON public.research_results;
CREATE POLICY "Allow public read access"
ON public.research_results FOR SELECT
TO anon, authenticated
USING (true);

-- Create policies for authenticated insert/update/delete
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.research_results;
CREATE POLICY "Allow authenticated insert"
ON public.research_results FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.research_results;
CREATE POLICY "Allow authenticated update"
ON public.research_results FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.research_results;
CREATE POLICY "Allow authenticated delete"
ON public.research_results FOR DELETE
TO authenticated
USING (true);

-- Create index for query performance
CREATE INDEX IF NOT EXISTS idx_research_results_query ON public.research_results(query);
CREATE INDEX IF NOT EXISTS idx_research_results_status ON public.research_results(status);
CREATE INDEX IF NOT EXISTS idx_research_results_created_at ON public.research_results(created_at DESC);
