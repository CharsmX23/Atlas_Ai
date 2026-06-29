'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { ResultsView } from './ResultsView'
import { MissionStatusBar } from '@/components/mission/MissionStatusBar'
import type { BusinessResult, LiveEvent } from './constants'
import { Check, AlertTriangle, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Exact agent_name values the backend emits — order matches pipeline execution
const AGENTS = [
  { name: 'Discovering local businesses', domain: 'serper.dev' },
  { name: 'Enriching contact details',    domain: 'places.googleapis.com' },
  { name: 'Verifying & scoring results',  domain: 'internal' },
  { name: 'Ranking by confidence',        domain: 'internal' },
] as const

interface AgentState {
  status: 'queued' | 'running' | 'done' | 'warning' | 'failed'
  results: number
  duration: string
}

interface Props {
  query: string
  phase: 'running' | 'complete'
  onComplete: () => void
  onReset: () => void
  onNewMission?: (query: string) => void
  onRetry?: () => void
  realResults?: BusinessResult[] | null
  liveBusinesses?: BusinessResult[]
  liveEvents?: LiveEvent[]
  researchStats?: Record<string, number> | null
  sourceScores?: Record<string, number> | null
  connectionStatus?: 'idle' | 'connecting' | 'connected' | 'failed'
}

export function MissionControl({
  query,
  phase,
  onComplete,
  onReset,
  onNewMission,
  onRetry,
  realResults,
  liveBusinesses = [],
  liveEvents = [],
  researchStats,
  sourceScores,
  connectionStatus = 'connecting',
}: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef(false)

  // Elapsed timer — stops when mission completes
  useEffect(() => {
    if (phase === 'complete') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Detect "Mission complete" event → transition to results
  useEffect(() => {
    if (completedRef.current) return
    const last = liveEvents[liveEvents.length - 1]
    if (last?.title === 'Mission complete') {
      completedRef.current = true
      onComplete()
      setTimeout(() => setShowResults(true), 400)
    }
  }, [liveEvents, onComplete])

  // Phase flip from outside (polling/direct-fetch path) — also reacts to realResults arriving
  useEffect(() => {
    if (phase === 'complete' && !showResults && !completedRef.current) {
      completedRef.current = true
      setTimeout(() => setShowResults(true), 500)
    }
    // Immediately show if results are already available (beats the 500ms timeout)
    if (realResults && realResults.length > 0 && phase === 'complete' && !showResults) {
      completedRef.current = true
      setShowResults(true)
    }
  }, [phase, showResults, realResults])

  // Auto-scroll timeline as new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [liveEvents.length])

  // Build agent status from real events — supports both event_type and status fields
  const agentStatus = useMemo(() => {
    const map: Record<string, AgentState> = {}
    const startMs: Record<string, number> = {}

    for (const ev of liveEvents) {
      const name = ev.agent_name
      if (!name) continue
      const ts = new Date(ev.created_at).getTime()
      const type = ev.event_type || ev.status

      if (type === 'started' || type === 'running' || type === 'active') {
        startMs[name] = ts
        map[name] = { status: 'running', results: map[name]?.results ?? 0, duration: '...' }
      } else if (type === 'completed' || type === 'done') {
        const durationSec = startMs[name] ? (ts - startMs[name]) / 1000 : 0
        const text = ev.message || ev.subtitle || ''
        const m = text.match(
          /(\d+)\s+(?:results?|listings?|entries|profiles?|providers?|pages?|records?|attorneys?|businesses?|rated)/i
        )
        const results = m ? parseInt(m[1]) : (map[name]?.results ?? 0)
        map[name] = { status: 'done', results, duration: durationSec > 0 ? `${durationSec.toFixed(1)}s` : '' }
      } else if (type === 'rate_limited') {
        map[name] = { status: 'warning', results: map[name]?.results ?? 0, duration: map[name]?.duration ?? '' }
      } else if (type === 'failed') {
        map[name] = { status: 'failed', results: map[name]?.results ?? 0, duration: '' }
      }
    }
    return map
  }, [liveEvents])

  const agentsComplete = Object.values(agentStatus).filter((a) => a.status === 'done').length
  const agentsRunning  = Object.values(agentStatus).filter((a) => a.status === 'running').length
  // Prefer live business count (from Realtime INSERT) over parsed event subtitles
  const eventsResultSum = Object.values(agentStatus).reduce((sum, a) => sum + a.results, 0)
  const resultsFound   = liveBusinesses.length > 0 ? liveBusinesses.length : eventsResultSum
  const totalAgents    = AGENTS.length
  const progress = liveEvents.length === 0
    ? 3
    : Math.min(97, ((agentsComplete + agentsRunning * 0.5) / totalAgents) * 100)

  // Derive job start time from first event (for relative timestamps in timeline)
  const jobStartMs = liveEvents.length > 0
    ? new Date(liveEvents[0].created_at).getTime()
    : Date.now()

  if (showResults) {
    return (
      <div className="h-full flex flex-col">
        <MissionStatusBar
          query={query}
          phase={phase}
          progress={100}
          elapsed={elapsed}
          agentsComplete={totalAgents}
          agentsTotal={totalAgents}
          resultsFound={realResults?.length ?? resultsFound}
          confidence={92}
          verifiedCount={realResults?.length ?? resultsFound}
          onNewMission={onNewMission}
          connectionStatus={connectionStatus}
        />
        <div className="flex-1 min-h-1 overflow-hidden">
          <ResultsView
            onReset={onReset}
            onNewMission={() => { setShowResults(false); onReset() }}
            results={realResults}
            phase={phase}
            query={query}
            stats={researchStats}
            sourceScores={sourceScores}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MissionStatusBar
        query={query}
        phase={phase}
        progress={progress}
        elapsed={elapsed}
        agentsComplete={agentsComplete}
        agentsTotal={totalAgents}
        resultsFound={resultsFound}
        onNewMission={onNewMission}
        connectionStatus={connectionStatus}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Timeline (65%) */}
        <div className="flex-[65] overflow-hidden flex flex-col relative">
          {/* Fade-out gradient at top for older events */}
          {liveEvents.length > 8 && (
            <div
              className="absolute top-0 left-0 right-0 h-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 100%)' }}
            />
          )}
          <div ref={scrollRef} className="px-8 py-6 overflow-y-auto h-full">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Timeline
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {liveEvents.length === 0 ? (
              connectionStatus === 'failed' ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ background: 'var(--error)' }} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      Backend unreachable
                    </p>
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      Check your connection and NEXT_PUBLIC_BACKEND_URL.
                    </p>
                  </div>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-medium transition"
                      style={{
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border)',
                        background: 'var(--surface-card)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-hi)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                    >
                      <RefreshCw size={13} strokeWidth={1.5} />
                      Retry connection
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )
            ) : (
              <div className="space-y-0">
                {liveEvents.slice(-50).map((ev, i) => (
                  <TimelineRow key={ev.id || i} event={ev} jobStartMs={jobStartMs} />
                ))}
              </div>
            )}

            {/* ── LIVE RESULTS — stream in as businesses are found ── */}
            <AnimatePresence>
              {liveBusinesses.length > 0 && !(realResults && realResults.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[11px] font-medium uppercase tracking-[0.08em]"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      Live Results
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <motion.span
                      key={liveBusinesses.length}
                      initial={{ scale: 1.3, color: 'var(--success)' }}
                      animate={{ scale: 1, color: 'var(--text-faint)' }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] font-medium tabular-nums"
                    >
                      {liveBusinesses.length} found
                    </motion.span>
                  </div>
                  <div className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {liveBusinesses.map((biz, i) => (
                        <LiveBusinessCard key={biz.rank ?? i} biz={biz} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT — Agents (35%) */}
        <div
          className="flex-[35] border-l overflow-hidden flex flex-col"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-panel)' }}
        >
          <div className="px-5 py-6 overflow-y-auto h-full">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Agents
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span
                className="text-[11px] font-medium tabular-nums"
                style={{ color: agentsComplete === totalAgents && agentsComplete > 0 ? 'var(--success)' : 'var(--text-faint)' }}
              >
                {agentsComplete}/{totalAgents}
                {agentsComplete === totalAgents && agentsComplete > 0 && ' ✓'}
              </span>
            </div>
            <div className="space-y-2">
              {AGENTS.map((agent) => {
                const s = agentStatus[agent.name] ?? {
                  status: 'queued' as const,
                  results: 0,
                  duration: '',
                }
                return (
                  <AgentCard
                    key={agent.name}
                    name={agent.name}
                    domain={agent.domain}
                    state={s}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineRow({ event, jobStartMs }: { event: LiveEvent; jobStartMs: number }) {
  const type = event.event_type || event.status
  const message = event.message || event.title

  // Elapsed time relative to job start
  const elapsedSec = Math.max(0, Math.floor((new Date(event.created_at).getTime() - jobStartMs) / 1000))
  const mm = Math.floor(elapsedSec / 60).toString().padStart(2, '0')
  const ss = (elapsedSec % 60).toString().padStart(2, '0')
  const timeLabel = `+${mm}:${ss}`

  const icon = (() => {
    if (type === 'done' || type === 'completed') {
      return (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
          <Check size={13} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
        </motion.div>
      )
    }
    if (type === 'started' || type === 'running' || type === 'active') {
      return <span className="w-2 h-2 rounded-full mt-0.5 animate-pulse" style={{ background: '#3b82f6' }} />
    }
    if (type === 'warn' || type === 'rate_limited') {
      return <AlertTriangle size={13} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />
    }
    if (type === 'failed') {
      return <span className="text-[13px] leading-none font-medium" style={{ color: 'var(--error)' }}>✗</span>
    }
    return <span className="w-2 h-2 rounded-full mt-0.5" style={{ background: 'var(--text-faint)' }} />
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex items-start gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="mt-[3px] w-4 shrink-0 flex justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
            {message}
          </span>
          <span className="text-[11px] font-mono shrink-0 tabular-nums" style={{ color: 'var(--text-faint)' }}>
            {timeLabel}
          </span>
        </div>
        {event.subtitle && event.subtitle !== message && (
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {event.subtitle}
          </p>
        )}
      </div>
    </motion.div>
  )
}

const AGENT_COLORS = {
  queued:  { border: 'var(--border)',   bg: 'var(--surface-card)',        dot: 'var(--text-faint)', text: 'var(--text-faint)' },
  running: { border: '#3b82f6',         bg: 'rgba(59,130,246,0.07)',      dot: '#3b82f6',           text: '#3b82f6'           },
  done:    { border: 'var(--success)',  bg: 'rgba(74,222,128,0.06)',      dot: 'var(--success)',    text: 'var(--success)'    },
  warning: { border: 'var(--warning)',  bg: 'rgba(234,179,8,0.07)',       dot: 'var(--warning)',    text: 'var(--warning)'    },
  failed:  { border: 'var(--error)',    bg: 'rgba(239,68,68,0.07)',       dot: 'var(--error)',      text: 'var(--error)'      },
}

function AgentCard({ name, domain, state }: { name: string; domain: string; state: AgentState }) {
  const c = AGENT_COLORS[state.status]

  return (
    <motion.div
      layout
      className="rounded-xl border transition-colors duration-300"
      style={{ padding: '10px 13px', background: c.bg, borderColor: c.border }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status indicator */}
          {state.status === 'queued' && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--border-hi)' }} />
          )}
          {state.status === 'running' && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: c.dot }} />
          )}
          {state.status === 'done' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="shrink-0"
            >
              <Check size={12} strokeWidth={2.5} style={{ color: c.dot }} />
            </motion.div>
          )}
          {state.status === 'warning' && (
            <AlertTriangle size={12} strokeWidth={1.5} className="shrink-0" style={{ color: c.dot }} />
          )}
          {state.status === 'failed' && (
            <span className="text-[12px] leading-none shrink-0 font-bold" style={{ color: c.dot }}>✗</span>
          )}
          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {name}
          </span>
        </div>

        {/* Right label */}
        <span className="text-[11px] tabular-nums shrink-0" style={{ color: c.text }}>
          {state.status === 'done' && state.results > 0 && `${state.results} found`}
          {state.status === 'done' && state.results === 0 && state.duration}
          {state.status === 'running' && '...'}
          {state.status === 'warning' && 'retrying'}
          {state.status === 'failed' && 'failed'}
        </span>
      </div>

      <div className="mt-0.5 pl-[18px]">
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{domain}</span>
        {state.status === 'done' && state.duration && state.results > 0 && (
          <span className="text-[10px] ml-2 tabular-nums" style={{ color: 'var(--text-faint)' }}>{state.duration}</span>
        )}
      </div>

      {state.status === 'running' && (
        <div className="mt-2 h-[2px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: c.dot }}
            animate={{ width: ['15%', '60%', '35%', '80%', '15%'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
    </motion.div>
  )
}

function LiveBusinessCard({ biz }: { biz: BusinessResult }) {
  const score = biz.confidence_score
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--border)',
        borderLeft: '2px solid var(--success)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {biz.business_name}
        </p>
        {biz.address && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-faint)' }}>
            {biz.address}
          </p>
        )}
      </div>
      <span
        className="text-[11px] font-medium tabular-nums shrink-0 px-1.5 py-0.5 rounded"
        style={{ color: scoreColor, background: 'rgba(0,0,0,0.2)' }}
      >
        {score}%
      </span>
    </motion.div>
  )
}
