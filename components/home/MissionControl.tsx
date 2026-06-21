'use client'

import { useEffect, useState, useRef } from 'react'
import { TIMELINE_SCRIPT, AGENT_SCRIPT } from './constants'
import { ResultsView } from './ResultsView'
import { MissionStatusBar } from '@/components/mission/MissionStatusBar'
import type { TimelineEvent, AgentDef } from './constants'
import { Check, X, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  query: string
  phase: 'running' | 'complete'
  onComplete: () => void
  onReset: () => void
}

export function MissionControl({ query, phase, onComplete, onReset }: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const agentsDone = AGENT_SCRIPT.filter((a) => currentStep >= a.endAt).length
  const totalAgents = AGENT_SCRIPT.length
  const progress = Math.min(100, (currentStep / TIMELINE_SCRIPT.length) * 100)
  const resultsFound = Math.round((currentStep / TIMELINE_SCRIPT.length) * 47)

  // Elapsed timer
  useEffect(() => {
    if (phase === 'complete') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Advance timeline
  useEffect(() => {
    if (phase === 'complete') return
    if (currentStep >= TIMELINE_SCRIPT.length) {
      const t = setTimeout(() => {
        onComplete()
        setTimeout(() => setShowResults(true), 1200)
      }, 800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCurrentStep((s) => s + 1), 1500)
    return () => clearTimeout(t)
  }, [currentStep, phase, onComplete])

  // Auto-scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight
    }
  }, [currentStep])

  const visibleEvents = TIMELINE_SCRIPT.slice(0, currentStep)

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
          resultsFound={47}
          confidence={92}
          verifiedCount={47}
        />
        <div className="flex-1 min-h-1 overflow-hidden">
          <ResultsView onReset={onReset} onNewMission={() => { setShowResults(false); onReset() }} />
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
        agentsComplete={agentsDone}
        agentsTotal={totalAgents}
        resultsFound={resultsFound}
      />

      {/* Main content area: Timeline left, Agents right */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Timeline (65%) */}
        <div className="flex-[65] overflow-hidden flex flex-col">
          <div className="px-8 py-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-faint)' }}>
                Timeline
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <div ref={timelineRef} className="space-y-0">
              {visibleEvents.map((ev, i) => (
                <TimelineRow key={i} event={ev} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Agents (35%) */}
        <div className="flex-[35] border-l overflow-hidden flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface-panel)' }}>
          <div className="px-5 py-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-faint)' }}>
                Agents
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <div className="space-y-2">
              {AGENT_SCRIPT.map((agent) => (
                <AgentCard key={agent.id} agent={agent} currentStep={currentStep} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineRow({ event, index }: { event: TimelineEvent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.08 }}
      className="flex items-start gap-4 py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="mt-0.5 w-5 shrink-0 flex justify-center">
        {event.dot === 'done' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
          </motion.div>
        )}
        {event.dot === 'active' && (
          <span className="w-2 h-2 rounded-full mt-1 animate-pulse-warm" style={{ background: 'var(--text-primary)' }} />
        )}
        {event.dot === 'warn' && (
          <AlertTriangle size={14} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />
        )}
        {event.dot === 'idle' && (
          <span className="text-[12px] font-mono-ui mt-0.5" style={{ color: 'var(--text-faint)' }}>—</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[14px] font-medium leading-snug" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {event.title}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-variant-tnum font-mono-ui" style={{ color: 'var(--text-faint)' }}>
              {event.sub ? '0.8s' : ''}
            </span>
            <span className="text-[11px] font-variant-tnum font-mono-ui" style={{ color: 'var(--text-faint)' }}>
              {formatTime(event.t)}
            </span>
          </div>
        </div>
        {event.sub && (
          <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {event.sub}
          </p>
        )}
        {event.dot === 'active' && event.progress !== undefined && (
          <div className="mt-2 h-[3px] rounded-full w-48 overflow-hidden" style={{ background: 'var(--border)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--text-primary)' }}
              animate={{ width: `${event.progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function AgentCard({ agent, currentStep }: { agent: AgentDef; currentStep: number }) {
  let status: 'queued' | 'running' | 'done' = 'queued'
  if (currentStep >= agent.endAt) status = 'done'
  else if (currentStep >= agent.startAt) status = 'running'

  const progress =
    status === 'done' ? 100
    : status === 'running' ? Math.min(100, ((currentStep - agent.startAt) / (agent.endAt - agent.startAt)) * 100)
    : 1

  return (
    <motion.div
      layout
      className="mb-3 rounded-xl border transition-all duration-200"
      style={{
        minHeight: '60px',
        padding: '12px 14px',
        background: 'var(--surface-card)',
        borderColor: status === 'running' ? 'var(--border-hi)' : 'var(--border)',
        boxShadow: status === 'running' ? '0 0 0 1px var(--border-hi)' : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {status === 'done' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check size={13} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
            </motion.div>
          )}
          {status === 'running' && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-warm" style={{ background: 'var(--text-primary)' }} />
          )}
          {status === 'queued' && (
            <span className="text-[11px] font-mono-ui" style={{ color: 'var(--text-faint)' }}>—</span>
          )}
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {agent.name}
          </span>
        </div>
        {status === 'done' && (
          <span className="text-[11px] font-variant-tnum font-mono-ui" style={{ color: 'var(--text-faint)' }}>
            {(agent.endAt - agent.startAt) * 1.5}s
          </span>
        )}
        {status === 'running' && (
          <span className="text-[11px] animate-pulse" style={{ color: 'var(--text-muted)' }}>
            ...
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1 pl-[22px]">
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          {agent.domain}
        </span>
        {agent.results > 0 && status === 'done' && (
          <span className="text-[12px] font-variant-tnum" style={{ color: 'var(--text-secondary)' }}>
            {agent.results} results
          </span>
        )}
      </div>
      {status === 'running' && (
        <div className="mt-2.5 h-[2px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--text-primary)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  )
}

function formatTime(t: number) {
  const base = new Date()
  base.setHours(10, 43, 12)
  base.setSeconds(base.getSeconds() + t)
  return base.toTimeString().slice(0, 8)
}
