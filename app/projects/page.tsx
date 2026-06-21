'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { FolderOpen, Plus, Clock, Search } from 'lucide-react'

const projects = [
  { name: 'Healthcare Birmingham', desc: 'Medical specialists in the Birmingham metro area', jobs: 12, businesses: 247, updated: '2h ago' },
  { name: 'Legal Services Chicago', desc: 'Attorneys and law firms in Cook County', jobs: 8, businesses: 412, updated: '1d ago' },
  { name: 'Home Services Texas', desc: 'Plumbers, electricians, and HVAC contractors', jobs: 5, businesses: 189, updated: '3d ago' },
]

export default function Projects() {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Projects</h1>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Saved research collections</p>
          </div>
          <button className="flex items-center gap-2 border rounded-lg px-4 py-2 text-[14px] transition" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <Plus size={16} strokeWidth={1.5} />
            New project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <FolderOpen size={40} className="mx-auto mb-4" strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
              <p className="text-[16px] mb-2" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
              <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Start your first research to create a project.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.name} className="rounded-xl p-5 border transition cursor-pointer hover:brightness-105" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                <FolderOpen size={20} className="mb-3" strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                <div className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                <div className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>{p.desc}</div>
                <div className="flex items-center gap-4 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                  <span className="flex items-center gap-1"><Search size={12} strokeWidth={1.5} />{p.jobs} jobs</span>
                  <span className="flex items-center gap-1"><Clock size={12} strokeWidth={1.5} />{p.updated}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  )
}
