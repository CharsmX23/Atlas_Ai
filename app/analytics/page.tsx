'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { BarChart3, LineChart, PieChart, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Analytics() {
  const [stats, setStats] = useState({
    totalSearches: 0,
    totalBusinesses: 0,
    verificationRate: 0,
    avgDuration: 0,
  })
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      const { data: jobs } = await supabase
        .from('research_jobs')
        .select('*')
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!jobs || jobs.length === 0) {
        setLoading(false)
        return
      }

      const totalFound = jobs.reduce((sum, j) => sum + (j.stats?.found || 0), 0)
      const totalVerified = jobs.reduce((sum, j) => sum + (j.stats?.verified || 0), 0)
      const avgDuration =
        jobs.reduce((sum, j) => sum + (j.stats?.duration_seconds || 0), 0) / jobs.length

      setStats({
        totalSearches: jobs.length,
        totalBusinesses: totalFound,
        verificationRate:
          totalFound > 0 ? Math.round((totalVerified / totalFound) * 100) : 0,
        avgDuration: Math.round(avgDuration),
      })
      setRecentJobs(jobs.slice(0, 7))
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  const kpi = [
    { label: 'Total searches', value: stats.totalSearches, icon: Activity },
    { label: 'Businesses found', value: stats.totalBusinesses, icon: BarChart3 },
    { label: 'Verification rate', value: `${stats.verificationRate}%`, icon: PieChart },
    { label: 'Avg duration', value: stats.avgDuration > 0 ? `${stats.avgDuration}s` : '—', icon: LineChart },
  ]

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Analytics</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>Real performance metrics from your research missions</p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
              <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
              Loading analytics...
            </div>
          </div>
        ) : (
          <>
            {/* KPI cards */}
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

            {/* Recent missions */}
            <div className="rounded-xl border p-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Research Missions</h2>
              {recentJobs.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No completed missions yet.</p>
              ) : (
                <div>
                  {recentJobs.map((job, i) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between py-3"
                      style={{ borderBottom: i < recentJobs.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{job.query}</div>
                        <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {new Date(job.created_at).toLocaleDateString()}
                          {job.stats?.duration_seconds ? ` · ${job.stats.duration_seconds}s` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold font-variant-tnum" style={{ color: 'var(--text-primary)' }}>
                          {job.stats?.found ?? 0}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>businesses</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </AppLayout>
  )
}
