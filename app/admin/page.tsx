'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { Server, Activity, HardDrive, Cpu, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase, type AgentRegistry } from '@/lib/supabase'

const logs = [
  '14:23:01  [audit]    Quality score: 89% → PASS',
  '14:22:58  [dedup]    Merged 6 duplicate records',
  '14:22:55  [verify]   38/47 verified across 3+ sources',
  '14:22:51  [gov]      Queried AL Medical Board — 23 licenses',
  '14:22:48  [web]      Visited 44 sites, extracted 156 fields',
  '14:22:44  [conflict] Phone mismatch: Cardiology PC of Birmingham',
  '14:22:40  [yelp]     18 listings found',
  '14:22:38  [linkedin] 8 profiles scanned',
  '14:22:35  [hg]       31 cardiologists found',
  '14:22:32  [google]   23 results in 0.8s',
]

export default function Admin() {
  const [workers, setWorkers] = useState<AgentRegistry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemStats, setSystemStats] = useState({
    uptime: '99.7%',
    activeWorkers: '0/0',
    cacheSize: '1.2 GB',
    throughput: '42/min',
  })

  useEffect(() => {
    async function loadWorkers() {
      try {
        const { data, error } = await supabase
          .from('agent_registry')
          .select('*')
          .order('name', { ascending: true })
        if (error) throw error
        setWorkers(data || [])
        
        const active = data?.filter((w: AgentRegistry) => w.status === 'online').length || 0
        const total = data?.length || 0
        setSystemStats((prev) => ({
          ...prev,
          activeWorkers: `${active}/${total}`,
        }))
      } catch (err: any) {
        setError(err.message || 'Failed to load workers')
      } finally {
        setLoading(false)
      }
    }
    loadWorkers()
  }, [])

  const stats = [
    { label: 'System uptime', value: systemStats.uptime, icon: Server, trend: 'up' as 'up' | 'down' | 'neutral' },
    { label: 'Active workers', value: systemStats.activeWorkers, icon: Cpu, trend: 'up' as 'up' | 'down' | 'neutral' },
    { label: 'Cache size', value: systemStats.cacheSize, icon: HardDrive, trend: 'neutral' as 'up' | 'down' | 'neutral' },
    { label: 'Throughput', value: systemStats.throughput, icon: Zap, trend: 'up' as 'up' | 'down' | 'neutral' },
  ]

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Admin</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>System health, worker status, and live logs</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((s) => {
            const Icon = s.icon
            const TrendIcon = s.trend === 'up' ? TrendingUp : s.trend === 'down' ? TrendingDown : null
            const trendColor = s.trend === 'up' ? 'var(--success)' : s.trend === 'down' ? 'var(--error)' : 'var(--text-muted)'
            return (
              <div key={s.label} className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                    <span className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  </div>
                  {TrendIcon && <TrendIcon size={14} strokeWidth={1.5} style={{ color: trendColor }} />}
                </div>
                <div className="text-[28px] font-semibold font-variant-tnum" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Worker pool</h2>
            <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              {loading ? (
                <div className="p-8 text-center text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading workers...</div>
              ) : error ? (
                <div className="p-8 text-center text-[14px]" style={{ color: 'var(--error)' }}>{error}</div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left px-4 py-3 font-medium">Agent</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Jobs</th>
                      <th className="text-left px-4 py-3 font-medium">Avg latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((w) => (
                      <tr key={w.id} className="transition" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: w.status === 'online' ? 'var(--success)' : w.status === 'degraded' ? 'var(--warning)' : 'var(--error)' }} />
                            {w.name}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium capitalize" style={{ color: w.status === 'online' ? 'var(--success)' : w.status === 'degraded' ? 'var(--warning)' : 'var(--error)' }}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-variant-tnum" style={{ color: 'var(--text-secondary)' }}>{w.jobs}</td>
                        <td className="px-4 py-2.5 font-variant-tnum" style={{ color: 'var(--text-faint)' }}>{w.latency_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Streaming logs</h2>
            <div className="rounded-xl overflow-hidden border p-4 font-mono-ui text-[12px] space-y-1 max-h-[420px] overflow-y-auto" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  <span style={{ color: 'var(--text-faint)' }}>{log.split('  ')[0]}</span>
                  <span style={{ color: 'var(--text-secondary)' }}> {log.split('  ')[1]} </span>
                  <span style={{ color: 'var(--text-primary)' }}>{log.split('  ')[2]}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-warm" style={{ background: 'var(--text-primary)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>Live streaming...</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl p-4 flex items-center gap-3 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <AlertTriangle size={18} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />
          <div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>1 conflict detected</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Phone mismatch: Cardiology PC of Birmingham — flagged for review</div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
