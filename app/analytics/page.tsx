'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { Search, Building2, Percent, Hash, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Job {
  id: string
  query: string
  status: string
  businesses_found: number | null
  businesses_verified: number | null
  research_duration_seconds: number | null
  created_at: string
}

interface Stats {
  totalSearches: number
  totalBusinesses: number
  avgConfidence: number
  topCategory: string
}

interface DataQuality {
  website: number
  phone: number
  hours: number
  license: number
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--success)' }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats>({ totalSearches: 0, totalBusinesses: 0, avgConfidence: 0, topCategory: '—' })
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [topQueries, setTopQueries] = useState<Array<{ query: string; count: number }>>([])
  const [dataQuality, setDataQuality] = useState<DataQuality>({ website: 0, phone: 0, hours: 0, license: 0 })
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  const fetchAll = useCallback(async () => {
    const [{ data: jobs }, { data: businesses }] = await Promise.all([
      supabase.from('research_jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('businesses').select('confidence_score, website, phone, working_hours, license_info'),
    ])

    if (!jobs || jobs.length === 0) {
      setLoading(false)
      setHasData(false)
      return
    }

    setHasData(true)

    // Stat cards
    const totalBusinesses = jobs.reduce((s, j) => s + (j.businesses_found ?? 0), 0)
    const avgConfidence = businesses && businesses.length > 0
      ? Math.round(businesses.reduce((s, b) => s + (b.confidence_score ?? 0), 0) / businesses.length)
      : 0

    const stopwords = new Set(['in', 'the', 'a', 'an', 'for', 'and', 'or', 'near', 'of', 'to', 'at', 'with', 'by'])
    const wordCount: Record<string, number> = {}
    for (const job of jobs) {
      for (const w of (job.query ?? '').toLowerCase().split(/\s+/)) {
        if (w.length > 2 && !stopwords.has(w)) wordCount[w] = (wordCount[w] ?? 0) + 1
      }
    }
    const topCategory = Object.entries(wordCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    setStats({ totalSearches: jobs.length, totalBusinesses, avgConfidence, topCategory })
    setRecentJobs((jobs as Job[]).slice(0, 20))

    // Top queries (grouped)
    const qc: Record<string, number> = {}
    for (const j of jobs) {
      const q = (j.query ?? '').toLowerCase().trim()
      if (q) qc[q] = (qc[q] ?? 0) + 1
    }
    setTopQueries(
      Object.entries(qc)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([query, count]) => ({ query, count }))
    )

    // Data quality from businesses table
    if (businesses && businesses.length > 0) {
      const n = businesses.length
      setDataQuality({
        website: Math.round(businesses.filter(b => b.website).length / n * 100),
        phone:   Math.round(businesses.filter(b => b.phone).length / n * 100),
        hours:   Math.round(businesses.filter(b => b.working_hours).length / n * 100),
        license: Math.round(businesses.filter(b => b.license_info).length / n * 100),
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'research_jobs' }, () => fetchAll())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  const kpiCards = [
    { label: 'Total Searches',     value: stats.totalSearches,                             icon: Search    },
    { label: 'Businesses Found',   value: stats.totalBusinesses.toLocaleString(),           icon: Building2 },
    { label: 'Avg Confidence',     value: stats.avgConfidence > 0 ? `${stats.avgConfidence}%` : '—', icon: Percent  },
    { label: 'Top Category',       value: stats.topCategory,                               icon: Hash      },
  ]

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-8 max-w-[1200px] mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-[26px] mb-1"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Analytics
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Live metrics from your research missions
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
              <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text-primary)' }} />
              Loading analytics...
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasData && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
            >
              <BarChart3Icon />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No research data yet</p>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Run your first search to see analytics</p>
            </div>
            <Link
              href="/research"
              className="mt-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition"
              style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
            >
              Start researching
            </Link>
          </div>
        )}

        {/* Dashboard */}
        {!loading && hasData && (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((k) => {
                const Icon = k.icon
                return (
                  <motion.div
                    key={k.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border p-5"
                    style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={15} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
                      <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-faint)' }}>
                        {k.label}
                      </span>
                    </div>
                    <div className="text-[28px] font-semibold leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {k.value}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Recent searches table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Searches</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Query', 'Businesses Found', 'Verified', 'Duration', 'Date', ''].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left font-medium"
                          style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job, i) => (
                      <tr
                        key={job.id}
                        style={{ borderBottom: i < recentJobs.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        <td className="px-6 py-3.5" style={{ color: 'var(--text-primary)', maxWidth: '260px' }}>
                          <span className="truncate block" title={job.query}>{job.query}</span>
                        </td>
                        <td className="px-6 py-3.5 tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {job.businesses_found ?? 0}
                        </td>
                        <td className="px-6 py-3.5 tabular-nums" style={{ color: 'var(--success)' }}>
                          {job.businesses_verified ?? 0}
                        </td>
                        <td className="px-6 py-3.5 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                          {job.research_duration_seconds != null ? `${job.research_duration_seconds}s` : '—'}
                        </td>
                        <td className="px-6 py-3.5" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-3.5">
                          <Link
                            href={`/research?job_id=${job.id}`}
                            className="flex items-center gap-1 text-[12px] font-medium transition hover:opacity-70"
                            style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
                          >
                            View results
                            <ExternalLink size={11} strokeWidth={2} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom two panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Quality */}
              <div className="rounded-xl border p-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Data Quality Coverage</h2>
                <ProgressBar label="Website Coverage"  value={dataQuality.website}  />
                <ProgressBar label="Phone Coverage"    value={dataQuality.phone}    />
                <ProgressBar label="Hours Coverage"    value={dataQuality.hours}    />
                <ProgressBar label="License Coverage"  value={dataQuality.license}  />
              </div>

              {/* Top Queries */}
              <div className="rounded-xl border p-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Top Queries</h2>
                <div className="space-y-2.5">
                  {topQueries.map(({ query, count }) => (
                    <div key={query} className="flex items-center justify-between gap-4">
                      <span
                        className="text-[13px] truncate min-w-0"
                        style={{ color: 'var(--text-secondary)' }}
                        title={query}
                      >
                        {query}
                      </span>
                      <span
                        className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0"
                        style={{ background: 'var(--surface-panel)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      >
                        ×{count}
                      </span>
                    </div>
                  ))}
                  {topQueries.length === 0 && (
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No repeated queries yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AppLayout>
  )
}

function BarChart3Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
