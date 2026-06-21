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

export const mockResults: BusinessResult[] = [
  {
    rank: 1,
    business_name: "Birmingham Heart Specialists",
    address: "2000 Brookwood Medical Center Dr, Birmingham, AL 35209",
    phone: { value: "(205) 877-5500", sources: 6, links: ["https://bhamheart.com", "https://healthgrades.com/directory/...", "https://yellowpages.com/birmingham/..."] },
    email: { value: "info@bhamheart.com", sources: 3, links: ["https://bhamheart.com"] },
    website: { value: "https://www.bhamheart.com", sources: 5 },
    working_hours: { value: "Mon-Fri 8:00 AM – 5:00 PM", sources: 2 },
    rating: "4.8",
    review_count: "127",
    services: ["Interventional Cardiology", "Heart Failure", "Cardiac Imaging", "Nuclear Cardiology", "Preventive Care"],
    specialties: ["Electrophysiology", "Cardiac Catheterization"],
    license_information: { value: "AL-MED-2847362", source: "Alabama Medical Board", link: "https://alalm.org/..." },
    certifications: ["Board Certified Cardiologist", "FACC"],
    awards: ["Best Cardiologist Birmingham 2024"],
    social_profiles: ["https://linkedin.com/company/bhamheart", "https://facebook.com/bhamheart"],
    images_urls: [],
    source_urls: { phone: "https://bhamheart.com", working_hours: "https://bhamheart.com/hours", certifications: "https://alalm.org/..." },
    confidence_score: 0.96,
    verification_status: "verified",
    source_count: 6,
  },
  {
    rank: 2,
    business_name: "UAB Heart & Vascular Center",
    address: "1802 6th Ave S, Birmingham, AL 35294",
    phone: { value: "(205) 934-9999", sources: 5 },
    email: { value: "heartcare@uab.edu", sources: 2 },
    website: { value: "https://www.uabmedicine.org/heart", sources: 6 },
    working_hours: { value: "Mon-Fri 8:00 AM – 4:30 PM", sources: 3 },
    rating: "4.9",
    review_count: "234",
    services: ["Advanced Heart Failure", "Transplant Cardiology", "Electrophysiology"],
    specialties: ["Structural Heart Disease"],
    license_information: { value: "AL-MED-0012938", source: "Alabama Medical Board", link: "https://alalm.org/..." },
    certifications: ["FACC", "FSCAI"],
    awards: [],
    social_profiles: ["https://linkedin.com/company/uab-medicine"],
    images_urls: [],
    source_urls: { phone: "https://uabmedicine.org", working_hours: "https://uabmedicine.org/hours" },
    confidence_score: 0.98,
    verification_status: "verified",
    source_count: 7,
  },
  {
    rank: 3,
    business_name: "ABC Cardiology Associates",
    address: "123 Medical Drive, Birmingham, AL 35203",
    phone: { value: "(205) 933-0600", sources: 2 },
    email: { value: "", sources: 0 },
    website: { value: "https://www.abccardio.com", sources: 3 },
    working_hours: { value: "Mon-Fri 9AM-5PM, Sat 9AM-1PM", sources: 2 },
    rating: "4.6",
    review_count: "89",
    services: ["General Cardiology", "Echocardiography"],
    specialties: [],
    license_information: { value: "AL-MED-1923847", source: "Alabama Medical Board", link: "https://alalm.org/..." },
    certifications: [],
    awards: [],
    social_profiles: [],
    images_urls: [],
    source_urls: { phone: "https://yellowpages.com/...", working_hours: "https://abccardio.com" },
    confidence_score: 0.78,
    verification_status: "partial",
    source_count: 3,
  },
  {
    rank: 4,
    business_name: "Cardiology PC of Birmingham",
    address: "513 Brookwood Blvd, Birmingham, AL 35209",
    phone: { value: "(205) 871-5014", sources: 1, conflictValue: "(205) 871-5099", conflictSource: "yelp.com" },
    email: { value: "", sources: 0 },
    website: { value: "https://www.cardiologybirmingham.com", sources: 2 },
    working_hours: { value: "Mon-Thu 8AM-5PM, Fri 8AM-3PM", sources: 1 },
    rating: "4.4",
    review_count: "67",
    services: ["General Cardiology", "Nuclear Stress Testing"],
    specialties: [],
    license_information: null,
    certifications: [],
    awards: [],
    social_profiles: [],
    images_urls: [],
    source_urls: { phone: "https://yellowpages.com/..." },
    confidence_score: 0.61,
    verification_status: "conflict",
    source_count: 2,
  },
  {
    rank: 5,
    business_name: "Grandview Heart & Vascular",
    address: "3690 Grandview Pkwy, Birmingham, AL 35243",
    phone: { value: "(205) 971-5100", sources: 4 },
    email: { value: "appointments@grandviewheart.com", sources: 2 },
    website: { value: "https://www.grandviewheart.com", sources: 4 },
    working_hours: { value: "Mon-Fri 7:30AM-5PM", sources: 3 },
    rating: "4.7",
    review_count: "156",
    services: ["Cardiac Catheterization", "Stress Testing", "Holter Monitoring"],
    specialties: ["Peripheral Vascular Disease"],
    license_information: { value: "AL-MED-3847261", source: "Alabama Medical Board", link: "https://alalm.org/..." },
    certifications: ["FACC"],
    awards: ["Top Doctor Birmingham 2025"],
    social_profiles: ["https://facebook.com/grandviewheart"],
    images_urls: [],
    source_urls: { phone: "https://grandviewheart.com", working_hours: "https://grandviewheart.com", certifications: "https://alalm.org/..." },
    confidence_score: 0.89,
    verification_status: "verified",
    source_count: 5,
  },
]
