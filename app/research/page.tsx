'use client'

import { useState } from 'react'
import { IdleHero } from '@/components/home/IdleHero'
import { MissionControl } from '@/components/home/MissionControl'
import { BottomSearchBar } from '@/components/mission/BottomSearchBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { motion } from 'framer-motion'

type Phase = 'idle' | 'running' | 'complete'

export default function Research() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'deep' | 'fast'>('deep')

  const startMission = (q: string) => {
    setQuery(q)
    setPhase('running')
  }

  const resetMission = () => {
    setQuery('')
    setPhase('idle')
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
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
              key="mission"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <MissionControl
                query={query}
                phase={phase}
                onComplete={() => setPhase('complete')}
                onReset={resetMission}
              />
            </motion.div>
          )}
        </div>
        {/* Only show search bar when NOT running — instant remove, no animation */}
        {phase !== 'running' && (
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
              compact={phase !== 'idle'}
              isRunning={false}
              phase={phase}
              query={query}
              onReset={resetMission}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
