'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { IdleHero } from '@/components/home/IdleHero'
import { MissionControl } from '@/components/home/MissionControl'
import { BottomSearchBar } from '@/components/mission/BottomSearchBar'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { testBackendConnection, type BackendCheckResult } from '@/lib/api'
import { useSettings, SOURCE_BACKEND_KEYS } from '@/lib/settings-context'
import { useSearchParams } from 'next/navigation'
import type { BusinessResult, LiveEvent } from '@/components/home/constants'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Phase = 'idle' | 'running' | 'complete'

// ── Map a flat backend business row to the BusinessResult display type ─────────
function toBusinessResult(b: Record<string, unknown>, index: number): BusinessResult {
  const asStr = (v: unknown): string => (typeof v === 'string' ? v : '')
  const asNum = (v: unknown, fallback: number): number =>
    typeof v === 'number' ? v : fallback
  const asArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : []

  // source_urls is now a per-field dict from the backend
  const srcUrls: Record<string, string> =
    typeof b.source_urls === 'object' && b.source_urls !== null && !Array.isArray(b.source_urls)
      ? (b.source_urls as Record<string, string>)
      : {}

  const licStr = asStr(b.license_information)

  return {
    rank: asNum(b.rank, index + 1),
    business_name: asStr(b.business_name) || 'Unknown',
    address: asStr(b.address),
    phone: {
      value: asStr(b.phone),
      sources: asNum(b.source_count, 1),
      links: srcUrls.phone ? [srcUrls.phone] : [],
    },
    email: {
      value: asStr(b.email),
      sources: 0,
      links: srcUrls.email ? [srcUrls.email] : [],
    },
    website: {
      value: asStr(b.website),
      sources: asNum(b.source_count, 1),
    },
    working_hours: {
      value: asStr(b.working_hours),
      sources: srcUrls.working_hours ? 1 : 0,
      links: srcUrls.working_hours ? [srcUrls.working_hours] : [],
    },
    rating: asStr(b.rating),
    review_count: asStr(b.review_count),
    services: asArr(b.services),
    specialties: asArr(b.specialties),
    license_information: licStr
      ? {
          value: licStr,
          source: 'Government DB',
          link: srcUrls.license_information || '',
        }
      : null,
    certifications: asArr(b.certifications),
    awards: asArr(b.awards),
    social_profiles: asArr(b.social_profiles),
    images_urls: asArr(b.images_urls),
    source_urls: srcUrls,
    confidence_score: asNum(b.confidence_score, 72),   // integer 0–100
    is_verified: typeof b.is_verified === 'boolean' ? b.is_verified : false,
    verification_status:
      (asStr(b.verification_status) as BusinessResult['verification_status']) || 'partial',
    source_count: asNum(b.source_count, 1),
  }
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed'

function ResearchInner() {
  const { settings, loaded: settingsLoaded } = useSettings()
  const searchParams = useSearchParams()
  const jobIdParam = searchParams.get('job_id')

  const [phase, setPhase] = useState<Phase>('idle')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'deep' | 'fast'>('deep')
  const [realResults, setRealResults] = useState<BusinessResult[]>([])
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [researchStats, setResearchStats] = useState<Record<string, number> | null>(null)
  const [sourceScores, setSourceScores] = useState<Record<string, number> | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [liveBusinesses, setLiveBusinesses] = useState<BusinessResult[]>([])
  const [backendCheck, setBackendCheck] = useState<BackendCheckResult | null>(null)
  // Increment each mission start to force MissionControl remount (clears internal timer/results state)
  const [missionKey, setMissionKey] = useState(0)

  // Sync mode from settings once they load
  useEffect(() => {
    if (settingsLoaded) setMode(settings.mode)
  }, [settingsLoaded, settings.mode])

  // Pre-flight: verify NEXT_PUBLIC_BACKEND_URL is pointing at the FastAPI service
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL ?? ''
    testBackendConnection(url).then(setBackendCheck)
  }, [])

  // Load job results when navigating from /reports with ?job_id=...
  useEffect(() => {
    if (!jobIdParam) return
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) return
    jobIdRef.current = jobIdParam
    setConnectionStatus('connected')
    setPhase('complete')
    fetch(`${backendUrl}/research/${jobIdParam}`)
      .then((r) => r.json())
      .then(({ businesses, job, source_scores, search_summary }) => {
        if (job?.query) setQuery(job.query)
        if (Array.isArray(businesses) && businesses.length > 0) {
          setRealResults((businesses as Record<string, unknown>[]).map(toBusinessResult))
        }
        if (search_summary && typeof search_summary === 'object') setResearchStats(search_summary)
        if (source_scores && typeof source_scores === 'object') setSourceScores(source_scores)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdParam])

  // Refs for cleanup — never trigger re-renders
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectionStatusRef = useRef<ConnectionStatus>('idle')
  const backoffRef = useRef(1000)
  const jobIdRef = useRef<string | null>(null)

  const _cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
  }

  // ── Polling with exponential backoff + Supabase event fallback ──────────────
  const pollJob = (jobId: string, backendUrl: string) => {
    const attempt = async () => {
      try {
        // Fetch agent_events directly from Supabase (fallback if Realtime isn't enabled)
        const { data: events } = await supabase
          .from('agent_events')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true })
        if (events && events.length > 0) {
          setLiveEvents(events as LiveEvent[])
        }

        // Fetch job status from backend
        const pollUrl = `${backendUrl}/research/${jobId}`
        console.log(`[Atlas AI] Polling ${pollUrl}`)
        const res = await fetch(pollUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { job, businesses, source_scores, search_summary } = await res.json()

        // Mark connected on first successful poll
        if (connectionStatusRef.current !== 'connected') {
          console.log('[Atlas AI] Backend connected')
          connectionStatusRef.current = 'connected'
          setConnectionStatus('connected')
          backoffRef.current = 1000
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
            connectionTimeoutRef.current = null
          }
        }

        if (job?.status === 'complete') {
          if (Array.isArray(businesses) && businesses.length > 0) {
            setRealResults((businesses as Record<string, unknown>[]).map(toBusinessResult))
          }
          if (search_summary && typeof search_summary === 'object') setResearchStats(search_summary)
          if (source_scores && typeof source_scores === 'object') setSourceScores(source_scores)
          setTimeout(() => setPhase('complete'), 800)
        } else {
          // Still running — schedule next poll
          pollTimeoutRef.current = setTimeout(attempt, 3000)
        }
      } catch (err) {
        console.error('[Atlas AI] Poll error:', err)
        const delay = backoffRef.current
        backoffRef.current = Math.min(delay * 2, 8000)
        console.log(`[Atlas AI] Retrying poll in ${delay}ms`)
        pollTimeoutRef.current = setTimeout(attempt, delay)
      }
    }
    // First poll after 2s (give backend time to start processing)
    pollTimeoutRef.current = setTimeout(attempt, 2000)
  }

  // ── Subscribe to Supabase Realtime for a given job ──────────────────────────
  const subscribeToJob = (jobId: string) => {
    const channel = supabase
      .channel(`research:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_events', filter: `job_id=eq.${jobId}` },
        (payload) => {
          const ev = payload.new as LiveEvent
          setLiveEvents((prev) => {
            if (prev.some((e) => e.id === ev.id)) return prev
            return [...prev, ev]
          })
          if (connectionStatusRef.current !== 'connected') {
            connectionStatusRef.current = 'connected'
            setConnectionStatus('connected')
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current)
              connectionTimeoutRef.current = null
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'businesses', filter: `job_id=eq.${jobId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const biz = toBusinessResult(row, 0)
          setLiveBusinesses((prev) => {
            // Deduplicate by business_name as a safe fallback (rank may not be set yet)
            if (prev.some((b) => b.business_name === biz.business_name)) return prev
            return [...prev, biz]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'research_jobs', filter: `id=eq.${jobId}` },
        async (payload) => {
          if (payload.new.status === 'complete') {
            const { data } = await supabase
              .from('businesses')
              .select('*')
              .eq('job_id', jobId)
              .order('rank')
            if (data && data.length > 0) {
              setRealResults((data as Record<string, unknown>[]).map(toBusinessResult))
            }
            setTimeout(() => setPhase('complete'), 800)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  // ── Start mission ───────────────────────────────────────────────────────────
  const startMission = useCallback((q: string) => {
    _cleanup()
    setMissionKey((k) => k + 1)
    setQuery(q)
    setPhase('running')
    setRealResults([])
    setLiveEvents([])
    setLiveBusinesses([])
    jobIdRef.current = null
    backoffRef.current = 1000
    connectionStatusRef.current = 'connecting'
    setConnectionStatus('connecting')

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) {
      console.warn('[Atlas AI] NEXT_PUBLIC_BACKEND_URL not set — running in demo mode')
      return
    }

    // 30-second hard timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectionStatusRef.current !== 'connected') {
        console.error('[Atlas AI] Connection timeout after 30s')
        connectionStatusRef.current = 'failed'
        setConnectionStatus('failed')
      }
    }, 30000)

    const enabledSources = settings.sources.map((s) => SOURCE_BACKEND_KEYS[s] ?? s)
    const postUrl = `${backendUrl}/research`
    console.log(`[Atlas AI] POST ${postUrl}`, { query: q, mode })

    fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, mode, enabled_sources: enabledSources }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} from ${postUrl}`)
        return r.json()
      })
      .then(({ job_id }: { job_id?: string }) => {
        if (!job_id) {
          console.error('[Atlas AI] No job_id in POST response')
          return
        }
        console.log(`[Atlas AI] Job started: ${job_id}`)
        jobIdRef.current = job_id
        subscribeToJob(job_id)
        pollJob(job_id, backendUrl)
      })
      .catch((err: Error) => {
        console.error(`[Atlas AI] Failed to start research: ${postUrl}`, err.message)
        connectionStatusRef.current = 'failed'
        setConnectionStatus('failed')
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, settings.sources])

  const resetMission = useCallback(() => {
    _cleanup()
    jobIdRef.current = null
    connectionStatusRef.current = 'idle'
    setConnectionStatus('idle')
    setQuery('')
    setPhase('idle')
    setRealResults([])
    setLiveEvents([])
    setLiveBusinesses([])
    setResearchStats(null)
    setSourceScores(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After job complete: do one final fetch to ensure we have all results
  // (pollJob transitions to complete, but Realtime path skips the final fetch)
  useEffect(() => {
    if (phase !== 'complete') return
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    const jobId = jobIdRef.current
    if (!backendUrl || !jobId) return

    const fetchFinal = () =>
      fetch(`${backendUrl}/research/${jobId}`)
        .then((r) => r.json())
        .then(({ businesses, source_scores, search_summary }) => {
          if (Array.isArray(businesses) && businesses.length > 0) {
            setRealResults((businesses as Record<string, unknown>[]).map(toBusinessResult))
          }
          if (search_summary && typeof search_summary === 'object') setResearchStats(search_summary)
          if (source_scores && typeof source_scores === 'object') setSourceScores(source_scores)
        })
        .catch(() => {})

    fetchFinal()
    const t = setTimeout(fetchFinal, 3000)
    return () => clearTimeout(t)
  }, [phase])

  const handleComplete = useCallback(() => setPhase('complete'), [])

  return (
    <AppLayout>
      {/*
        flex-col fills the full height of motion.main.
        The inner content div (flex-1) grows to fill; the search bar (shrink-0)
        sits at bottom — only on idle. No fixed positioning anywhere.
      */}
      <div className="flex flex-col h-full min-h-0">
        {/* Content area — fills remaining space */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {phase === 'idle' ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <IdleHero onQueryClick={(q) => startMission(q)} />
            </motion.div>
          ) : (
            <motion.div
              key={`mission-${missionKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <MissionControl
                query={query}
                phase={phase}
                onComplete={handleComplete}
                onReset={resetMission}
                onNewMission={startMission}
                onRetry={() => startMission(query)}
                realResults={realResults}
                liveBusinesses={liveBusinesses}
                liveEvents={liveEvents}
                researchStats={researchStats}
                sourceScores={sourceScores}
                connectionStatus={connectionStatus}
              />
            </motion.div>
          )}
        </div>

        {/* Backend mis-config warning — shown on idle only, dismissed once a mission starts */}
        {phase === 'idle' && backendCheck && !backendCheck.ok && (
          <motion.div
            key="backend-warning"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 px-6 pb-2"
          >
            <div
              className="mx-auto max-w-[600px] flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]"
              style={{
                borderColor: 'rgba(234,179,8,0.3)',
                background: 'rgba(234,179,8,0.07)',
                color: 'var(--warning)',
              }}
            >
              <span className="mt-px shrink-0 font-bold">⚠</span>
              <div>
                {backendCheck.reason === 'not_configured' && (
                  <>
                    <span className="font-semibold">NEXT_PUBLIC_BACKEND_URL is not set.</span>
                    {' '}Add it in your Vercel project settings → Environment Variables. Real searches will not work.
                  </>
                )}
                {backendCheck.reason === 'returns_html' && (
                  <>
                    <span className="font-semibold">Backend URL is returning HTML, not JSON.</span>
                    {' '}
                    <span className="font-mono text-[11px] opacity-70">
                      {('url' in backendCheck ? backendCheck.url : '')}
                    </span>
                    {' '}is probably pointing at a Vercel/Next.js deployment instead of the Railway FastAPI service.
                    Check your <span className="font-mono">NEXT_PUBLIC_BACKEND_URL</span> env var.
                  </>
                )}
                {backendCheck.reason === 'unreachable' && (
                  <>
                    <span className="font-semibold">Backend unreachable.</span>
                    {' '}
                    <span className="font-mono text-[11px] opacity-70">
                      {('url' in backendCheck ? backendCheck.url : '')}
                    </span>
                    {' '}— {'detail' in backendCheck ? backendCheck.detail : ''}. Check Railway is deployed and the URL is correct.
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Search bar — only on idle homepage, never on running/complete */}
        {phase === 'idle' && (
          <motion.div
            key="searchbar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="shrink-0"
          >
            <BottomSearchBar
              onSubmit={startMission}
              mode={mode}
              setMode={setMode}
              isRunning={false}
            />
          </motion.div>
        )}
      </div>
    </AppLayout>
  )
}

export default function Research() {
  return (
    <Suspense>
      <ResearchInner />
    </Suspense>
  )
}
