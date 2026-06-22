'use client'

import { Sidebar } from './Sidebar'
import { motion } from 'framer-motion'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-atlas-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex-1 overflow-auto h-full"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
