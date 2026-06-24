'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, RotateCcw, ArrowRight, X } from 'lucide-react'

interface MissionStatusBarProps {
  query: string
  phase: 'running' | 'complete'
  progress: number
  elapsed: number
  agentsComplete: number
  agentsTotal: number
  resultsFound: number
  confidence?: number
  verifiedCount?: number
  onNewMission?: (query: string) => void
  connectionStatus?: 'idle' | 'connecting' | 'connected' | 'failed'
}

export function MissionStatusBar({
  query,
  phase,
  progress,
  elapsed,
  agentsComplete,
  agentsTotal,
  resultsFound,
  confidence,
  verifiedCount,
  onNewMission,
  connectionStatus = 'connecting',
}: MissionStatusBarProps) {

  const connDot = {
    idle:       { bg: 'var(--text-faint)', pulse: false },
    connecting: { bg: 'var(--text-faint)', pulse: true  },
    connected:  { bg: 'var(--success)',    pulse: false },
    failed:     { bg: 'var(--error)',      pulse: false },
  }[connectionStatus]
  const [showInput, setShowInput] = useState(false)
  const [inputQuery, setInputQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const handleNewMissionSubmit = () => {
    if (!inputQuery.trim() || !onNewMission) return
    onNewMission(inputQuery.trim())
    setShowInput(false)
    setInputQuery('')
  }

  return (
    <motion.div
      layout
      className="border-b shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-panel)' }}
    >
      {phase === 'running' ? (
        <motion.div
          key="running"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="px-7 py-3.5"
        >
          {/* Row 1: Mission label + query + status badge */}
          <div className="flex items-start justify-between">
            <div>
              <span
                className="text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Mission
              </span>
              <h2
                className="text-[16px] font-semibold leading-tight mt-0.5 tracking-[-0.01em]"
                style={{ color: 'var(--text-primary)' }}
              >
                {query}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Connection status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${connDot.pulse ? 'animate-pulse-warm' : ''}`}
                style={{ background: connDot.bg }}
                title={connectionStatus}
              />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {connectionStatus === 'failed' ? 'Unreachable' : connectionStatus === 'connected' ? 'Running' : 'Connecting…'}
              </span>
            </div>
          </div>

          {/* Row 2: Progress bar */}
          <div className="mt-3 mb-2">
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '4px', background: 'var(--border)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--text-primary)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Row 3: Stats */}
          <div
            className="flex items-center gap-4 text-[12px] font-medium tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Elapsed {timeStr}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span
              style={{
                color: agentsComplete === agentsTotal && agentsComplete > 0
                  ? 'var(--success)'
                  : 'var(--text-muted)',
              }}
            >
              Agents {agentsComplete}/{agentsTotal}
              {agentsComplete === agentsTotal && agentsComplete > 0 && ' ✓'}
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <motion.span
              key={resultsFound}
              initial={{ scale: resultsFound > 0 ? 1.25 : 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ display: 'inline-block' }}
            >
              Results {resultsFound} found
            </motion.span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-7 py-3"
        >
          {/* Left: completion summary */}
          <div className="flex items-center gap-2.5 min-w-0 shrink">
            <Check size={15} strokeWidth={2.5} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              Mission complete
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {verifiedCount} businesses verified
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Confidence {confidence}%
            </span>
          </div>

          {/* Right: New mission inline input + elapsed */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {onNewMission && (
              showInput ? (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  className="flex items-center gap-2 rounded-xl border px-3"
                  style={{
                    borderColor: 'var(--border-hi)',
                    background: 'var(--surface-card)',
                    height: '34px',
                  }}
                >
                  <input
                    ref={inputRef}
                    value={inputQuery}
                    autoFocus
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNewMissionSubmit()
                      if (e.key === 'Escape') { setShowInput(false); setInputQuery('') }
                    }}
                    placeholder="New search..."
                    className="bg-transparent outline-none text-[13px]"
                    style={{
                      width: '200px',
                      color: 'var(--text-primary)',
                      caretColor: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handleNewMissionSubmit}
                    disabled={!inputQuery.trim()}
                    className="transition-opacity disabled:opacity-30"
                    style={{ color: 'var(--text-primary)', display: 'flex' }}
                  >
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => { setShowInput(false); setInputQuery('') }}
                    style={{ color: 'var(--text-faint)', display: 'flex' }}
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowInput(true)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-all"
                  style={{
                    height: '34px',
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border)',
                    background: 'var(--surface-card)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.borderColor = 'var(--border-hi)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <RotateCcw size={12} strokeWidth={2} />
                  New mission
                </motion.button>
              )
            )}
            <span
              className="text-[12px] tabular-nums"
              style={{ color: 'var(--text-faint)' }}
            >
              {elapsed}s
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
