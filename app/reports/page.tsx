'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'

const reports = [
  { name: 'Birmingham Cardiology Market', query: 'cardiologists in Birmingham', businesses: 47, generated: '2h ago', format: 'PDF' },
  { name: 'Chicago Legal Directory', query: 'lawyers in Chicago', businesses: 89, generated: '5h ago', format: 'PDF' },
  { name: 'Austin Dental Practices', query: 'dentists in Austin', businesses: 34, generated: '1d ago', format: 'CSV' },
  { name: 'Houston Plumbing Services', query: 'plumbers in Houston', businesses: 56, generated: '1d ago', format: 'JSON' },
  { name: 'Miami Real Estate Agents', query: 'real estate agents in Miami', businesses: 73, generated: '2d ago', format: 'Excel' },
]

export default function Reports() {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Reports</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>Generated research summaries</p>

        <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-3 font-medium">Report name</th>
                <th className="text-left px-4 py-3 font-medium">Query</th>
                <th className="text-left px-4 py-3 font-medium">Businesses</th>
                <th className="text-left px-4 py-3 font-medium">Generated</th>
                <th className="text-left px-4 py-3 font-medium">Format</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i} className="transition" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                      <span className="font-medium cursor-pointer hover:underline transition" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{r.query}</td>
                  <td className="px-4 py-3 font-variant-tnum" style={{ color: 'var(--text-secondary)' }}>{r.businesses}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-faint)' }}>{r.generated}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ color: 'var(--text-primary)', background: 'var(--accent-bg)', border: '1px solid var(--border)' }}>{r.format}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {['PDF', 'CSV', 'JSON', 'Excel'].map((fmt) => (
                        <button key={fmt} className="text-[11px] px-2 py-1 rounded border transition" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{fmt}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </AppLayout>
  )
}
