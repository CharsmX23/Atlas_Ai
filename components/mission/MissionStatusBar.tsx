'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

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
}: MissionStatusBarProps) {
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <motion.div
      layout
      className="border-b shrink-0"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface-panel)',
      }}
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
              <span
                className="w-2 h-2 rounded-full animate-pulse-warm"
                style={{ background: 'var(--text-primary)' }}
              />
              <span
                className="text-[13px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Running
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
            <span>Agents {agentsComplete}/{agentsTotal}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Results {resultsFound} found</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-7 py-3"
        >
          <div className="flex items-center gap-2.5">
            <Check size={15} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
            <span
              className="text-[14px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Mission complete
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span
              className="text-[13px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {verifiedCount} businesses verified
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span
              className="text-[13px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Confidence {confidence}%
            </span>
          </div>
          <span
            className="text-[12px] tabular-nums"
            style={{ color: 'var(--text-faint)' }}
          >
            {elapsed}s
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
