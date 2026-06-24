'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div
          className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 border-b z-30"
          style={{ background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Open navigation"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '18px',
              color: 'var(--text-primary)',
            }}
          >
            Atlas AI
          </span>
        </div>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex-1 overflow-auto min-h-0"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
