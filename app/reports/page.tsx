'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, CheckCircle, Zap, Clock, BarChart2, TrendingUp, Globe } from 'lucide-react'
import Link from 'next/link'

interface ResearchJob {
  id: string
  query: string
  status: string
  created_at: string
  businesses_found?: number
  businesses_verified?: number
  duplicates_removed?: number
  sources_searched?: number
  research_duration_seconds?: number
  data_quality?: Record<string, number>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true,
  })
}

function avg(nums: number[]) {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

// ── Progress bar ──────────────────────────────────────────────────────────
function QualityBar({ label, pct }: { label: string; pct: number }) {
  const color = pct > 80 ? 'var(--success)' : pct > 50 ? 'var(--warning)' : 'var(--error)'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'complete'
      ? { label: 'Completed', color: 'var(--success)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' }
      : status === 'running'
      ? { label: 'Running',   color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' }
      : { label: 'Failed',    color: 'var(--error)',   bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' }

  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-md border whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  )
}

export default function Reports() {
  const router = useRouter()
  const [jobs, setJobs] = useState<ResearchJob[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('research_jobs')
      .select('id, query, status, created_at, businesses_found, businesses_verified, duplicates_removed, sources_searched, research_duration_seconds, data_quality')
      .order('created_at', { ascending: false })
      .limit(200)
    setJobs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Realtime subscription — refresh on any job change
  useEffect(() => {
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'research_jobs' }, fetchJobs)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'research_jobs' }, fetchJobs)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchJobs])

  // ── Computed stats from completed jobs ────────────────────────────────
  const completed = jobs.filter((j) => j.status === 'complete')
  const tableJobs = jobs.slice(0, 20)

  const totalResearches = completed.length
  const totalBusinesses = completed.reduce((s, j) => s + (j.businesses_found ?? 0), 0)
  const totalVerified   = completed.reduce((s, j) => s + (j.businesses_verified ?? 0), 0)
  const durations       = completed.filter((j) => j.research_duration_seconds).map((j) => j.research_duration_seconds!)
  const avgDuration     = avg(durations)

  // Data quality averages
  const withQuality = completed.filter((j) => j.data_quality && Object.keys(j.data_quality).length > 0)
  const dqAvg = {
    website: avg(withQuality.map((j) => j.data_quality?.pct_with_website ?? 0)),
    phone:   avg(withQuality.map((j) => j.data_quality?.pct_with_phone ?? 0)),
    hours:   avg(withQuality.map((j) => j.data_quality?.pct_with_hours ?? 0)),
    license: avg(withQuality.map((j) => j.data_quality?.pct_with_license ?? 0)),
  }

  // Top queries
  const queryCounts: Record<string, number> = {}
  for (const job of jobs) {
    const q = job.query?.toLowerCase().trim()
    if (q) queryCounts[q] = (queryCounts[q] ?? 0) + 1
  }
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // ── Stat card component ───────────────────────────────────────────────
  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ElementType
    label: string
    value: string | number
    color?: string
  }) => (
    <div
      className="rounded-xl border p-5 flex flex-col gap-3"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent-bg)' }}
        >
          <Icon size={16} strokeWidth={1.5} style={{ color: color ?? 'var(--text-primary)' }} />
        </div>
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div
        className="text-[32px] font-bold tabular-nums leading-none"
        style={{ color: color ?? 'var(--text-primary)' }}
      >
        {value}
      </div>
    </div>
  )

  // ── Empty state ───────────────────────────────────────────────────────
  if (!loading && jobs.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center border"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
          >
            <BarChart2 size={24} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              No research missions yet
            </p>
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Start your first search to see analytics here
            </p>
          </div>
          <Link
            href="/research"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition min-h-[44px]"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
          >
            <Search size={15} strokeWidth={1.5} />
            Go to Research
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-4 md:p-8 space-y-6"
      >
        {/* Page header */}
        <div>
          <h1
            className="text-[24px] md:text-[26px] mb-1"
            style={{
              fontFamily: 'var(--font-serif-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Reports
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Real-time analytics across all research missions
          </p>
        </div>

        {/* ── TOP ROW: 4 Global Stat Cards ─────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border p-5 animate-pulse h-[110px]"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Search}       label="Total Researches"   value={totalResearches} />
            <StatCard icon={Globe}        label="Businesses Found"   value={totalBusinesses} />
            <StatCard icon={CheckCircle}  label="Total Verified"     value={totalVerified}   color="var(--success)" />
            <StatCard icon={Clock}        label="Avg Research Speed" value={durations.length > 0 ? `${avgDuration.toFixed(1)}s` : '—'} />
          </div>
        )}

        {/* ── MIDDLE: Recent Jobs Table ─────────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recent Research Jobs
            </h2>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Last {tableJobs.length} jobs
            </span>
          </div>

          {/* Mobile: card view */}
          <div className="divide-y md:hidden" style={{ borderColor: 'var(--border)' }}>
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="h-3.5 w-2/3 rounded" style={{ background: 'var(--border)' }} />
                  <div className="h-3 w-1/3 rounded" style={{ background: 'var(--border)' }} />
                </div>
              ))
            ) : (
              tableJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => router.push(`/research?job_id=${job.id}`)}
                  className="w-full text-left px-4 py-4 transition"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[14px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {job.query?.length > 40 ? job.query.slice(0, 40) + '…' : job.query}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    <span>Found: <strong style={{ color: 'var(--text-secondary)' }}>{job.businesses_found ?? 0}</strong></span>
                    <span>Verified: <strong style={{ color: 'var(--success)' }}>{job.businesses_verified ?? 0}</strong></span>
                    {job.research_duration_seconds != null && (
                      <span>Duration: <strong style={{ color: 'var(--text-secondary)' }}>{job.research_duration_seconds}s</strong></span>
                    )}
                    <span>{formatDate(job.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Desktop: table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  <th className="text-left px-5 py-3">Query</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Found</th>
                  <th className="text-right px-4 py-3">Verified</th>
                  <th className="text-right px-4 py-3">Dupes</th>
                  <th className="text-right px-4 py-3">Sources</th>
                  <th className="text-right px-4 py-3">Duration</th>
                  <th className="text-right px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2, 3].map((i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--border)', width: j === 0 ? '160px' : '40px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  tableJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="cursor-pointer transition"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => router.push(`/research?job_id=${job.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-3 max-w-[260px]">
                        <span className="font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                          {job.query?.length > 40 ? job.query.slice(0, 40) + '…' : job.query}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {job.businesses_found ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--success)' }}>
                        {job.businesses_verified ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {job.duplicates_removed ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {job.sources_searched ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-faint)' }}>
                        {job.research_duration_seconds != null ? `${job.research_duration_seconds}s` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                        {formatDate(job.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── BOTTOM ROW: Data Quality + Top Queries ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Quality Averages */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Zap size={16} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Data Quality Averages
              </h2>
            </div>
            {withQuality.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text-faint)' }}>
                No quality data yet — run more missions.
              </p>
            ) : (
              <div className="space-y-4">
                <QualityBar label="Records with Website"  pct={dqAvg.website} />
                <QualityBar label="Records with Phone"    pct={dqAvg.phone} />
                <QualityBar label="Records with Hours"    pct={dqAvg.hours} />
                <QualityBar label="Records with License"  pct={dqAvg.license} />
              </div>
            )}
          </div>

          {/* Top Queries */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Top Queries
              </h2>
            </div>
            {topQueries.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text-faint)' }}>
                No query data yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {topQueries.map(([q, count], idx) => (
                  <div key={q} className="flex items-center gap-3">
                    <span
                      className="text-[11px] font-semibold tabular-nums w-5 text-right shrink-0"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      #{idx + 1}
                    </span>
                    <span
                      className="flex-1 text-[13px] truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {q}
                    </span>
                    <span
                      className="text-[12px] font-semibold tabular-nums shrink-0 px-2 py-0.5 rounded-md"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'var(--accent-bg)',
                      }}
                    >
                      {count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
