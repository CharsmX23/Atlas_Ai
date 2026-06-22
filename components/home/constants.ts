export interface TimelineEvent {
  t: number
  dot: 'done' | 'active' | 'warn' | 'idle'
  title: string
  sub?: string
  progress?: number
}

/** Real-time event row from Supabase agent_events table */
export interface LiveEvent {
  id: string
  job_id: string
  title: string
  subtitle: string
  status: 'done' | 'running' | 'warn' | 'active'
  created_at: string
}

export const TIMELINE_SCRIPT: TimelineEvent[] = [
  { t: 0,  dot: 'done', title: 'Initializing Atlas', sub: 'Loading research engine' },
  { t: 1,  dot: 'done', title: 'Memory loaded', sub: '1,247 cached businesses available' },
  { t: 2,  dot: 'done', title: 'Query parsed', sub: 'Category: cardiology · Location: Birmingham, AL' },
  { t: 3,  dot: 'done', title: 'Launching 12 agents in parallel' },
  { t: 4,  dot: 'active', title: 'Searching Google', sub: '23 results in 0.8s', progress: 100 },
  { t: 5,  dot: 'active', title: 'Searching Healthgrades', sub: '31 cardiologists found', progress: 100 },
  { t: 6,  dot: 'active', title: 'Searching LinkedIn', sub: '8 professional profiles', progress: 100 },
  { t: 7,  dot: 'active', title: 'Searching Yelp', sub: '18 listings with reviews', progress: 100 },
  { t: 8,  dot: 'active', title: 'Searching Yellow Pages', sub: '15 directory entries', progress: 100 },
  { t: 9,  dot: 'warn', title: 'Conflict detected', sub: 'Phone mismatch: Cardiology PC of Birmingham' },
  { t: 10, dot: 'active', title: 'Reading 44 business websites' },
  { t: 11, dot: 'active', title: 'Querying Alabama Medical Board', sub: 'License verification for 23 doctors' },
  { t: 12, dot: 'active', title: 'Cross-checking phone numbers', sub: '38/47 verified across 3+ sources' },
  { t: 13, dot: 'active', title: 'Running deduplication', sub: 'RapidFuzz fuzzy matching · 6 duplicates merged' },
  { t: 14, dot: 'active', title: 'Computing confidence scores', sub: 'Average confidence: 87%' },
  { t: 15, dot: 'active', title: 'Building knowledge graph', sub: '312 nodes · 847 relationships' },
  { t: 16, dot: 'active', title: 'Quality audit', sub: 'Score: 89% · PASS · no re-research needed' },
  { t: 17, dot: 'done', title: 'Mission complete', sub: 'Generating report...' },
]

export interface AgentDef {
  id: string
  name: string
  domain: string
  startAt: number
  endAt: number
  results: number
  conf: number
}

export const AGENT_SCRIPT: AgentDef[] = [
  { id: 'google',   name: 'Google Search',      domain: 'google.com',         startAt: 3, endAt: 4,  results: 23, conf: 88 },
  { id: 'hg',       name: 'Healthgrades',       domain: 'healthgrades.com',   startAt: 3, endAt: 5,  results: 31, conf: 96 },
  { id: 'linkedin', name: 'LinkedIn',            domain: 'linkedin.com',       startAt: 3, endAt: 6,  results: 8,  conf: 90 },
  { id: 'yelp',     name: 'Yelp',                domain: 'yelp.com',           startAt: 3, endAt: 7,  results: 18, conf: 85 },
  { id: 'yp',       name: 'Yellow Pages',        domain: 'yellowpages.com',    startAt: 3, endAt: 8,  results: 15, conf: 80 },
  { id: 'fb',       name: 'Facebook',            domain: 'facebook.com',       startAt: 3, endAt: 9,  results: 6,  conf: 72 },
  { id: 'bbb',      name: 'BBB Verifier',        domain: 'bbb.org',            startAt: 4, endAt: 10, results: 12, conf: 91 },
  { id: 'gov',      name: 'AL Medical Board',    domain: 'alabama.gov',        startAt: 4, endAt: 11, results: 23, conf: 98 },
  { id: 'web',      name: 'Website Detail',      domain: '44 sites',           startAt: 5, endAt: 12, results: 44, conf: 100 },
  { id: 'verify',   name: 'Cross Verifier',      domain: 'internal',           startAt: 8, endAt: 13, results: 38, conf: 87 },
  { id: 'dedup',    name: 'Dedup Engine',        domain: 'internal',           startAt: 10, endAt: 14, results: 6,  conf: 100 },
  { id: 'audit',    name: 'Quality Auditor',     domain: 'internal',           startAt: 12, endAt: 16, results: 1,  conf: 89 },
]

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
  confidence_score: number
  verification_status: 'verified' | 'partial' | 'conflict'
  source_count: number
}

