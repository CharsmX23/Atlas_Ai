'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { IdleHero } from '@/components/home/IdleHero'
import { MissionControl } from '@/components/home/MissionControl'
import { BottomSearchBar } from '@/components/mission/BottomSearchBar'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
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
  // Increment each mission start to force MissionControl remount (clears internal timer/results state)
  const [missionKey, setMissionKey] = useState(0)

  // Sync mode from settings once they load
  useEffect(() => {
    if (settingsLoaded) setMode(settings.mode)
  }, [settingsLoaded, settings.mode])

  // Load job results when navigating from /reports with ?job_id=...
  useEffect(() => {
    if (!jobIdParam) return
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) return
    jobIdRef.current = jobIdParam
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const _cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // ── Subscribe to Supabase Realtime for a given job ──────────────────────────
  const subscribeToJob = (jobId: string, backendUrl: string) => {
    const channel = supabase
      .channel(`research:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const ev = payload.new as LiveEvent
          setLiveEvents((prev) => [...prev, ev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research_jobs',
          filter: `id=eq.${jobId}`,
        },
        async (payload) => {
          if (payload.new.status === 'complete') {
            const { data } = await supabase
              .from('businesses')
              .select('*')
              .eq('job_id', jobId)
              .order('rank')
            if (data && data.length > 0) {
              setRealResults(
                (data as Record<string, unknown>[]).map(toBusinessResult)
              )
            }
            setTimeout(() => setPhase('complete'), 800)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    // Fallback: poll every 3s in case Realtime is not enabled yet
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/research/${jobId}`)
        const { job, businesses } = await res.json()
        if (job?.status === 'complete' && Array.isArray(businesses) && businesses.length > 0) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setRealResults(
            (businesses as Record<string, unknown>[]).map(toBusinessResult)
          )
          setTimeout(() => setPhase('complete'), 800)
        }
      } catch {
        // backend unreachable during poll — ignore
      }
    }, 3000)
  }

  // ── Start mission ───────────────────────────────────────────────────────────
  const startMission = useCallback((q: string) => {
    // Clear ALL previous state before starting new search
    _cleanup()
    setMissionKey((k) => k + 1)   // force MissionControl remount
    setQuery(q)
    setPhase('running')
    setRealResults([])             // explicitly empty, not null
    setLiveEvents([])
    jobIdRef.current = null

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) return        // no backend → mock animation plays

    const enabledSources = settings.sources.map((s) => SOURCE_BACKEND_KEYS[s] ?? s)

    fetch(`${backendUrl}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, mode, enabled_sources: enabledSources }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Backend returned ${r.status}`)
        return r.json()
      })
      .then(({ job_id }: { job_id?: string }) => {
        if (!job_id) return
        jobIdRef.current = job_id
        subscribeToJob(job_id, backendUrl)
      })
      .catch(() => {
        // Backend unreachable — fall back to mock animation silently
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, settings.sources])

  const resetMission = useCallback(() => {
    _cleanup()
    jobIdRef.current = null
    setQuery('')
    setPhase('idle')
    setRealResults([])
    setLiveEvents([])
    setResearchStats(null)
    setSourceScores(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Always fetch ALL results when complete — Realtime misses bulk inserts.
  // Retry after 3s in case the first fetch lands before Supabase finishes writing.
  useEffect(() => {
    if (phase !== 'complete') return
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    const jobId = jobIdRef.current
    if (!backendUrl || !jobId) return

    const fetchResults = () =>
      fetch(`${backendUrl}/research/${jobId}`)
        .then((r) => r.json())
        .then(({ businesses, job, source_scores }) => {
          if (Array.isArray(businesses) && businesses.length > 0) {
            console.log('Fetched', businesses.length, 'real businesses')
            setRealResults((businesses as Record<string, unknown>[]).map(toBusinessResult))
          }
          if (job?.stats) setResearchStats(job.stats)
          if (source_scores && typeof source_scores === 'object') setSourceScores(source_scores)
        })
        .catch((e) => console.error('Results fetch failed:', e))

    fetchResults()
    const timer = setTimeout(fetchResults, 3000)
    return () => clearTimeout(timer)
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
                realResults={realResults}
                liveEvents={liveEvents}
                researchStats={researchStats}
                sourceScores={sourceScores}
              />
            </motion.div>
          )}
        </div>

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
