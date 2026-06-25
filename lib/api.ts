/**
 * Atlas AI — Backend API Client
 *
 * Connects the Next.js frontend to the FastAPI backend.
 * Uses NEXT_PUBLIC_API_URL for the backend base URL.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Types ──────────────────────────────────────────────────────────

export interface ResearchJob {
  id: string
  query: string
  mode: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  stats?: {
    found: number
    verified: number
    duplicates_removed: number
    sources_searched: number
    duration_seconds: number
  }
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  job_id: string
  rank: number
  business_name: string
  website: string
  source_urls: Record<string, string>
  source_count: number
  confidence_score: number
  verification_status: 'verified' | 'partial' | 'conflict'
  created_at: string
}

export interface AgentEvent {
  id: string
  job_id: string
  title: string
  subtitle: string
  status: string
  created_at: string
}

export interface ResearchResponse {
  job: ResearchJob
  businesses: Business[]
}

// ─── API Functions ──────────────────────────────────────────────────

/**
 * Start a new research job.
 * Returns the job_id which can be polled for progress.
 */
export async function startResearch(
  query: string,
  mode: 'deep' | 'fast' = 'deep'
): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Research API error (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Get the status and results of a research job.
 */
export async function getResearch(jobId: string): Promise<ResearchResponse> {
  const res = await fetch(`${API_BASE}/research/${jobId}`)

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Research API error (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Check if the backend is healthy.
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`)

  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }

  return res.json()
}

export type BackendCheckResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' }
  | { ok: false; reason: 'returns_html'; url: string }
  | { ok: false; reason: 'unreachable'; url: string; detail: string }

/**
 * Verify that the backend URL is configured and actually points to the FastAPI
 * service, not a Vercel/Next.js deployment. Returns a typed result describing
 * the failure reason so the UI can show an actionable message.
 */
export async function testBackendConnection(url: string): Promise<BackendCheckResult> {
  if (!url) return { ok: false, reason: 'not_configured' }

  try {
    const res = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      console.error(
        `[Atlas AI] Backend URL ${url}/health returned ${contentType} — likely pointing at a Next.js deployment`
      )
      return { ok: false, reason: 'returns_html', url }
    }

    if (!res.ok) {
      return { ok: false, reason: 'unreachable', url, detail: `HTTP ${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[Atlas AI] Backend health check failed for ${url}:`, detail)
    return { ok: false, reason: 'unreachable', url, detail }
  }
}
