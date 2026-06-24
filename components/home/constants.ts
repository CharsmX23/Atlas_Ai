/** Real-time event row from Supabase agent_events table */
export interface LiveEvent {
  id: string
  job_id: string
  title: string
  subtitle?: string
  message?: string
  event_type?: 'started' | 'completed' | 'failed' | 'rate_limited' | string
  status: 'done' | 'running' | 'warn' | 'active' | 'failed'
  agent_name?: string
  created_at: string
}

export interface FieldEvidence {
  value: string
  sources: number
  links?: string[]
  conflictValue?: string
  conflictSource?: string
}

export interface BusinessResult {
  rank: number
  business_name: string
  address: string
  phone: FieldEvidence
  email: FieldEvidence
  website: FieldEvidence
  working_hours: FieldEvidence
  rating: string
  review_count: string
  services: string[]
  specialties: string[]
  license_information: { value: string; source: string; link: string } | null
  certifications: string[]
  awards: string[]
  social_profiles: string[]
  images_urls: string[]
  source_urls: Record<string, string>
  confidence_score: number        // integer 0–100
  is_verified: boolean
  verification_status: 'verified' | 'partial' | 'conflict'
  source_count: number
}
