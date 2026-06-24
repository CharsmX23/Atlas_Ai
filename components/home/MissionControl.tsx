'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { ResultsView } from './ResultsView'
import { MissionStatusBar } from '@/components/mission/MissionStatusBar'
import type { BusinessResult, LiveEvent } from './constants'
import { Check, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

// Exact agent_name values the backend emits — order matches display order
const AGENTS = [
  { name: 'Google Search',   domain: 'google.com' },
  { name: 'Yelp',            domain: 'yelp.com' },
  { name: 'Yellow Pages',    domain: 'yellowpages.com' },
  { name: 'LinkedIn',        domain: 'linkedin.com' },
  { name: 'Facebook',        domain: 'facebook.com' },
  { name: 'BBB Verifier',    domain: 'bbb.org' },
  { name: 'Healthgrades',    domain: 'healthgrades.com' },
  { name: 'Avvo/Justia',     domain: 'avvo.com' },
  { name: 'Gov License DB',  domain: 'gov' },
  { name: 'Industry Dirs',   domain: 'angi.com' },
  { name: 'Website Detail',  domain: 'web' },
  { name: 'Quality Auditor', domain: 'internal' },
] as const

interface AgentState {
  status: 'queued' | 'running' | 'done'
  results: number
  duration: string
}

interface Props {
  query: string
  phase: 'running' | 'complete'
  onComplete: () => void
  onReset: () => void
  onNewMission?: (query: string) => void
  realResults?: BusinessResult[] | null
  liveEvents?: LiveEvent[]
  researchStats?: Record<string, number> | null
  sourceScores?: Record<string, number> | null
}

export function MissionControl({
  query,
  phase,
  onComplete,
  onReset,
  onNewMission,
  realResults,
  liveEvents = [],
  researchStats,
  sourceScores,
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
      setTimeout(() => setShowResults(true), 1200)
    }
  }, [liveEvents, onComplete])

  // Phase flip from outside (polling/direct-fetch path)
  useEffect(() => {
    if (phase === 'complete' && !showResults && !completedRef.current) {
      completedRef.current = true
      setTimeout(() => setShowResults(true), 400)
    }
  }, [phase, showResults])

  // Auto-scroll timeline as new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [liveEvents.length])

  // Build agent status from real events, computing duration from paired running/done timestamps
  const agentStatus = useMemo(() => {
    const map: Record<string, AgentState> = {}
    const startMs: Record<string, number> = {}

    for (const ev of liveEvents) {
      const name = ev.agent_name
      if (!name) continue
      const ts = new Date(ev.created_at).getTime()

      if (ev.status === 'running' || ev.status === 'active') {
        startMs[name] = ts
        map[name] = { status: 'running', results: map[name]?.results ?? 0, duration: '...' }
      } else if (ev.status === 'done') {
        const durationSec = startMs[name] ? (ts - startMs[name]) / 1000 : 0
        // Parse result count from subtitle: "5 results found", "31 providers found", "6 rated"
        const m = ev.subtitle?.match(
          /(\d+)\s+(?:results?|listings?|entries|profiles?|providers?|pages?|records?|attorneys?|businesses?|rated)/i
        )
        const results = m ? parseInt(m[1]) : (map[name]?.results ?? 0)
        map[name] = {
          status: 'done',
          results,
          duration: durationSec > 0 ? `${durationSec.toFixed(1)}s` : '',
        }
      }
    }
    return map
  }, [liveEvents])

  const agentsComplete = Object.values(agentStatus).filter((a) => a.status === 'done').length
  const agentsRunning  = Object.values(agentStatus).filter((a) => a.status === 'running').length
  const resultsFound   = Object.values(agentStatus).reduce((sum, a) => sum + a.results, 0)
  const totalAgents    = AGENTS.length
  const progress = liveEvents.length === 0
    ? 3
    : Math.min(97, ((agentsComplete + agentsRunning * 0.5) / totalAgents) * 100)

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
      />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Timeline (65%) */}
        <div className="flex-[65] overflow-hidden flex flex-col">
          <div ref={scrollRef} className="px-8 py-6 overflow-y-auto h-full">
            <div className="flex items-center gap-3 mb-6">
              <span
                className="text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Timeline
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {liveEvents.length === 0 ? (
              <div className="flex items-center gap-2.5 py-4">
                <span
                  className="w-2 h-2 rounded-full shrink-0 animate-pulse-warm"
                  style={{ background: 'var(--text-faint)' }}
                />
                <span className="text-[13px]" style={{ color: 'var(--text-faint)' }}>
                  Connecting to backend...
                </span>
              </div>
            ) : (
              <div className="space-y-0">
                {liveEvents.map((ev, i) => (
                  <TimelineRow key={ev.id || i} event={ev} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Agents (35%) */}
        <div
          className="flex-[35] border-l overflow-hidden flex flex-col"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-panel)' }}
        >
          <div className="px-5 py-6 overflow-y-auto h-full">
            <div className="flex items-center gap-3 mb-6">
              <span
                className="text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Agents
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
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

function TimelineRow({ event, index }: { event: LiveEvent; index: number }) {
  const timeDisplay = new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false })

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: index < 8 ? index * 0.04 : 0 }}
      className="flex items-start gap-4 py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="mt-0.5 w-5 shrink-0 flex justify-center">
        {event.status === 'done' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
          </motion.div>
        )}
        {(event.status === 'running' || event.status === 'active') && (
          <span
            className="w-2 h-2 rounded-full mt-1 animate-pulse-warm"
            style={{ background: 'var(--text-primary)' }}
          />
        )}
        {event.status === 'warn' && (
          <AlertTriangle size={14} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <span
            className="text-[14px] font-medium leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {event.title}
          </span>
          <span
            className="text-[11px] font-mono-ui shrink-0 tabular-nums"
            style={{ color: 'var(--text-faint)' }}
          >
            {timeDisplay}
          </span>
        </div>
        {event.subtitle && (
          <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {event.subtitle}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function AgentCard({
  name,
  domain,
  state,
}: {
  name: string
  domain: string
  state: AgentState
}) {
  return (
    <motion.div
      layout
      className="mb-3 rounded-xl border transition-all duration-200"
      style={{
        minHeight: '60px',
        padding: '12px 14px',
        background: 'var(--surface-card)',
        borderColor: state.status === 'running' ? 'var(--border-hi)' : 'var(--border)',
        boxShadow: state.status === 'running' ? '0 0 0 1px var(--border-hi)' : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {state.status === 'done' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check size={13} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
            </motion.div>
          )}
          {state.status === 'running' && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-warm"
              style={{ background: 'var(--text-primary)' }}
            />
          )}
          {state.status === 'queued' && (
            <span className="text-[11px] font-mono-ui" style={{ color: 'var(--text-faint)' }}>
              —
            </span>
          )}
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {name}
          </span>
        </div>
        {state.status === 'done' && state.duration && (
          <span
            className="text-[11px] font-mono-ui tabular-nums"
            style={{ color: 'var(--text-faint)' }}
          >
            {state.duration}
          </span>
        )}
        {state.status === 'running' && (
          <span className="text-[11px] animate-pulse" style={{ color: 'var(--text-muted)' }}>
            ...
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 pl-[22px]">
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          {domain}
        </span>
        {state.results > 0 && state.status === 'done' && (
          <span
            className="text-[12px] font-variant-tnum"
            style={{ color: 'var(--text-secondary)' }}
          >
            {state.results} results
          </span>
        )}
      </div>

      {state.status === 'running' && (
        <div
          className="mt-2.5 h-[2px] rounded-full overflow-hidden"
          style={{ background: 'var(--border)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--text-primary)' }}
            animate={{ width: ['20%', '65%', '40%', '75%', '20%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
    </motion.div>
  )
}
