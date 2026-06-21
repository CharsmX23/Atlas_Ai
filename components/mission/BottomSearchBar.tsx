'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ArrowRight, X, Sparkles, RotateCcw } from 'lucide-react'

interface BottomSearchBarProps {
  onSubmit: (query: string) => void
  mode: 'deep' | 'fast'
  setMode: (mode: 'deep' | 'fast') => void
  isRunning: boolean
  compact?: boolean
  placeholder?: string
  phase?: 'idle' | 'running' | 'complete'
  query?: string
  onReset?: () => void
}

export function BottomSearchBar({
  onSubmit,
  mode,
  setMode,
  isRunning,
  compact = false,
  placeholder = 'Research any business, service, or category...',
  phase = 'idle',
  query: propQuery,
  onReset,
}: BottomSearchBarProps) {
  const [query, setQuery] = useState(propQuery || '')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (propQuery !== undefined) {
      setQuery(propQuery)
    }
  }, [propQuery])

  const handleSubmit = () => {
    if (phase === 'complete') {
      onReset?.()
      return
    }
    if (!query.trim() || isRunning) return
    onSubmit(query.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-50 transition-all duration-300"
      style={{
        left: compact ? '72px' : '250px',
      }}
    >
      {/* Gradient fade behind bar */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}
      />

      {/* Bar content */}
      <div className="relative px-6 pb-8 pt-4">
        <div className="mx-auto" style={{ maxWidth: '900px', width: '90vw' }}>
          {/* Input wrapper */}
          <div
            className="flex flex-col transition-all duration-200"
            style={{
              background: 'var(--surface-card)',
              border: `1px solid ${isFocused ? 'var(--border-hi)' : 'var(--border)'}`,
              borderRadius: '20px',
              padding: '14px 18px 12px',
              boxShadow: isFocused
                ? '0 4px 24px rgba(0,0,0,0.18), 0 0 0 1px var(--border-hi)'
                : '0 4px 24px rgba(0,0,0,0.18)',
            }}
          >
            {/* Row 1: search icon + input */}
            <div className="flex items-center gap-3">
              <Search
                size={18}
                strokeWidth={1.5}
                className="shrink-0"
                style={{ color: 'var(--text-faint)' }}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none"
                style={{
                  fontSize: '18px',
                  color: 'var(--text-primary)',
                  caretColor: 'var(--text-primary)',
                }}
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setQuery('')}
                    className="p-1 rounded-full transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    whileHover={{ color: 'var(--text-secondary)' }}
                  >
                    <X size={15} strokeWidth={1.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Row 2: mode toggles + start button */}
            <div className="flex items-center justify-between mt-3 pl-[30px]">
              {/* Deep / Fast mode selector */}
              <div
                className="flex items-center gap-1 rounded-xl p-1 border"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              >
                {(['Deep', 'Fast'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m.toLowerCase() as 'deep' | 'fast')}
                    className="transition-all duration-150 rounded-lg font-medium"
                    style={{
                      fontSize: '13px',
                      padding: '8px 18px',
                      background: mode === m.toLowerCase() ? 'var(--surface-card)' : 'transparent',
                      color: mode === m.toLowerCase() ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: mode === m.toLowerCase() ? '1px solid var(--border)' : '1px solid transparent',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Start / New mission button */}
              <motion.button
                onClick={handleSubmit}
                disabled={phase === 'idle' ? !query.trim() : isRunning}
                className="flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                style={{
                  height: '46px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: phase === 'idle' && !query.trim() ? 'var(--border)' : 'var(--text-primary)',
                  color: phase === 'idle' && !query.trim() ? 'var(--text-faint)' : 'var(--bg)',
                  opacity: phase === 'idle' && !query.trim() ? 0.6 : 1,
                }}
                whileHover={!(phase === 'idle' && !query.trim()) ? { scale: 1.02 } : {}}
                whileTap={!(phase === 'idle' && !query.trim()) ? { scale: 0.98 } : {}}
              >
                {phase === 'complete' ? (
                  <>
                    <RotateCcw size={14} strokeWidth={2} />
                    New mission
                  </>
                ) : (
                  <>
                    <Sparkles size={14} strokeWidth={2} />
                    Start mission
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Below bar: hint text */}
          <p className="text-center mt-3 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            12 sources · cross-verified · cached · open-source
          </p>
        </div>
      </div>
    </div>
  )
}
