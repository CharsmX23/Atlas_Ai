'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { BarChart3, LineChart, PieChart, Activity } from 'lucide-react'

const kpi = [
  { label: 'Total research volume', value: 156, icon: Activity },
  { label: 'Average sources per query', value: '8.4', icon: BarChart3 },
  { label: 'Verification rate', value: '87%', icon: PieChart },
  { label: 'Mean research duration', value: '24s', icon: LineChart },
]

const sourceData = [
  { source: 'Google', value: 342 },
  { source: 'Healthgrades', value: 198 },
  { source: 'Yelp', value: 156 },
  { source: 'LinkedIn', value: 134 },
  { source: 'Yellow Pages', value: 112 },
  { source: 'Facebook', value: 89 },
  { source: 'BBB', value: 76 },
  { source: 'Gov DB', value: 67 },
]

const confidenceData = [
  { label: '>95%', count: 42 },
  { label: '85-95%', count: 68 },
  { label: '75-85%', count: 31 },
  { label: '<75%', count: 15 },
]

export default function Analytics() {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Analytics</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>Research performance and data quality metrics</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpi.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                  <span className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{k.label}</span>
                </div>
                <div className="text-[32px] font-semibold font-variant-tnum" style={{ color: 'var(--text-primary)' }}>{k.value}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Research volume (last 7 days)</h3>
            <div className="flex items-end gap-2 h-[160px]">
              {[24, 18, 32, 28, 45, 38, 52].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all" style={{ height: `${(v / 60) * 140}px`, background: 'var(--text-primary)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Source contributions</h3>
            <div className="space-y-2.5">
              {sourceData.map((s) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>{s.source}</span>
                    <span className="font-variant-tnum" style={{ color: 'var(--text-faint)' }}>{s.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.value / 400) * 100}%`, background: 'var(--text-primary)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Confidence distribution</h3>
            <div className="flex items-end gap-3 h-[140px]">
              {confidenceData.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm" style={{ height: `${(d.count / 80) * 120}px`, background: 'var(--text-primary)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Verification status</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-[120px] h-[120px]">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--success)" strokeWidth="12" strokeDasharray={`${(87 / 100) * 314} 314`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[20px] font-semibold font-variant-tnum" style={{ color: 'var(--text-primary)' }}>87%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: 'var(--success)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Verified (87%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: 'var(--warning)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Partial (9%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: 'var(--error)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Unverified (4%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
