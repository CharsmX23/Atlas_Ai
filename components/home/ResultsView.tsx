'use client'

import { useState, useMemo, useEffect } from 'react'
import type { BusinessResult } from './constants'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Phone, Mail, Globe, Clock, Star, ExternalLink, ChevronDown, Check, AlertTriangle, Shield, X, ChevronUp } from 'lucide-react'

interface ResearchStats {
  found?: number
  verified?: number
  duplicates_removed?: number
  sources_searched?: number
  duration_seconds?: number
}

interface Props {
  onReset: () => void
  onNewMission: () => void
  results?: BusinessResult[] | null
  phase?: 'running' | 'complete'
  query?: string
  stats?: ResearchStats | Record<string, number> | null
  sourceScores?: Record<string, number> | null
}

export function ResultsView({ onReset, onNewMission, results, phase, query, stats, sourceScores }: Props) {
  const baseResults = useMemo<BusinessResult[]>(() => results ?? [], [results])
  const [sortBy, setSortBy] = useState<'confidence' | 'rating' | 'name'>('confidence')

  // Delay "No results" message — show skeleton for up to 5s after complete
  const [waited, setWaited] = useState(false)
  useEffect(() => {
    if (phase !== 'complete') { setWaited(false); return }
    if (baseResults.length > 0) { setWaited(false); return }
    setWaited(false)
    const t = setTimeout(() => setWaited(true), 5000)
    return () => clearTimeout(t)
  }, [phase, baseResults.length])

  const [showVerified, setShowVerified] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)
  const [showHasWebsite, setShowHasWebsite] = useState(false)
  const [showHasPhone, setShowHasPhone] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...baseResults]
    if (showVerified) list = list.filter((b) => b.verification_status === 'verified')
    if (showConflicts) list = list.filter((b) => b.verification_status === 'conflict')
    if (showHasWebsite) list = list.filter((b) => b.website.value)
    if (showHasPhone) list = list.filter((b) => b.phone.value)
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase()
      list = list.filter((b) => b.business_name.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      if (sortBy === 'confidence') return b.confidence_score - a.confidence_score
      if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating)
      return a.business_name.localeCompare(b.business_name)
    })
    return list
  }, [baseResults, sortBy, showVerified, showConflicts, showHasWebsite, showHasPhone, nameFilter])

  const showSidebar = phase === 'complete' && (stats || baseResults.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* ── Filters bar ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b px-6 py-3 flex items-center gap-4 z-10"
        style={{ background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span>{filtered.length} businesses found</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="flex items-center gap-1">
            Sort:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'confidence' | 'rating' | 'name')}
              className="bg-transparent text-[13px] outline-none cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <option value="confidence">Confidence</option>
              <option value="rating">Rating</option>
              <option value="name">Name A-Z</option>
            </select>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <FilterChip active={showVerified} onClick={() => setShowVerified(!showVerified)} color="success">
            <Check size={12} strokeWidth={1.5} /> Verified
          </FilterChip>
          <FilterChip active={showConflicts} onClick={() => setShowConflicts(!showConflicts)} color="warning">
            <AlertTriangle size={12} strokeWidth={1.5} /> Conflicts
          </FilterChip>
          <FilterChip active={showHasWebsite} onClick={() => setShowHasWebsite(!showHasWebsite)}>
            Has website
          </FilterChip>
          <FilterChip active={showHasPhone} onClick={() => setShowHasPhone(!showHasPhone)}>
            Has phone
          </FilterChip>
        </div>

        <div className="ml-auto">
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
          >
            <Search size={14} style={{ color: 'var(--text-faint)' }} strokeWidth={1.5} />
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filter by name..."
              className="bg-transparent text-[13px] outline-none w-[140px]"
              style={{ color: 'var(--text-primary)' }}
            />
            {nameFilter && (
              <button onClick={() => setNameFilter('')} className="hover:opacity-70 transition">
                <X size={12} style={{ color: 'var(--text-faint)' }} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column content area ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="flex flex-col md:flex-row items-start gap-5 px-4 md:px-6 py-4 mx-auto"
          style={{ maxWidth: '1400px' }}
        >
          {/* ── RIGHT SIDEBAR — first in HTML = above on mobile ── */}
          {showSidebar && (
            <div className="w-full md:w-[320px] shrink-0 order-first md:order-last">
              <div style={{ position: 'sticky', top: '1rem' }}>
                <ResearchSidebar
                  query={query}
                  stats={stats}
                  businesses={baseResults}
                  sourceScores={sourceScores}
                />
              </div>
            </div>
          )}

          {/* ── LEFT: business list — below sidebar on mobile, left on desktop ── */}
          <div className="flex-1 min-w-0 order-last md:order-first space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                {baseResults.length === 0 && !waited ? (
                  <div className="w-full space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-2xl border p-5 animate-pulse"
                        style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 rounded w-1/3" style={{ background: 'var(--border)' }} />
                            <div className="h-3 rounded w-1/2" style={{ background: 'var(--border)' }} />
                            <div className="h-3 rounded w-2/5" style={{ background: 'var(--border)' }} />
                          </div>
                          <div className="h-8 w-20 rounded-lg" style={{ background: 'var(--border)' }} />
                        </div>
                        <div className="flex gap-6 mt-4">
                          <div className="h-3 rounded w-24" style={{ background: 'var(--border)' }} />
                          <div className="h-3 rounded w-28" style={{ background: 'var(--border)' }} />
                          <div className="h-3 rounded w-20" style={{ background: 'var(--border)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : baseResults.length === 0 && waited ? (
                  <>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center border"
                      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
                    >
                      <Search size={20} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        No results returned
                      </p>
                      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {process.env.NEXT_PUBLIC_BACKEND_URL
                          ? 'The backend search returned 0 results. Try a different query.'
                          : 'Backend not configured — set NEXT_PUBLIC_BACKEND_URL to run real searches.'}
                      </p>
                    </div>
                    <button
                      onClick={onNewMission}
                      className="text-[13px] font-medium px-4 py-2 rounded-lg border transition"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--surface-card)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      New mission
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      No results match current filters
                    </p>
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      Try removing some filters to see more results.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              filtered.map((biz) => (
                <BusinessCard
                  key={biz.business_name}
                  biz={biz}
                  expanded={expandedEvidence === biz.business_name}
                  onToggleEvidence={() =>
                    setExpandedEvidence(expandedEvidence === biz.business_name ? null : biz.business_name)
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  serper_google:  'Google Search',
  yelp:           'Yelp',
  yellowpages:    'Yellow Pages',
  linkedin:       'LinkedIn',
  bbb:            'BBB',
  healthgrades:   'Healthgrades',
  government:     'Gov. Licensing',
  industry_dirs:  'Industry Dirs',
}

function ResearchSidebar({
  query,
  stats,
  businesses,
  sourceScores,
}: {
  query?: string
  stats?: ResearchStats | Record<string, number> | null
  businesses: BusinessResult[]
  sourceScores?: Record<string, number> | null
}) {
  const [sourcesOpen, setSourcesOpen] = useState(true)

  const s = (stats || {}) as ResearchStats
  const n = businesses.length || 1

  const withWebsite = businesses.filter((b) => b.website?.value).length
  const withPhone   = businesses.filter((b) => b.phone?.value).length
  const withHours   = businesses.filter((b) => b.working_hours?.value).length
  const withLicense = businesses.filter((b) => b.license_information).length

  const pct = (count: number) => Math.round((count / n) * 100)

  const qualityBars = [
    { label: 'Records with website',       pct: pct(withWebsite) },
    { label: 'Records with phone',         pct: pct(withPhone) },
    { label: 'Records with working hours', pct: pct(withHours) },
    { label: 'Records with license info',  pct: pct(withLicense) },
  ]

  const barColor = (p: number) =>
    p > 80 ? 'var(--success)' : p > 50 ? 'var(--warning)' : 'var(--error)'

  return (
    <div className="space-y-3">
      {/* ── Search Summary ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
      >
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3"
          style={{ color: 'var(--text-faint)' }}
        >
          Search Summary
        </div>

        {query && (
          <div className="text-[13px] mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Query:{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {query}
            </span>
          </div>
        )}

        <div className="space-y-2.5">
          {[
            {
              label: 'Businesses Found',
              value: s.found ?? businesses.length,
              color: 'var(--text-primary)',
            },
            {
              label: 'Verified',
              value: s.verified ?? businesses.filter((b) => b.verification_status === 'verified').length,
              color: 'var(--success)',
            },
            {
              label: 'Duplicates Removed',
              value: s.duplicates_removed ?? 0,
              color: 'var(--text-secondary)',
            },
            {
              label: 'Sources Searched',
              value: s.sources_searched ?? 0,
              color: 'var(--text-secondary)',
            },
            {
              label: 'Duration',
              value: s.duration_seconds != null ? `${s.duration_seconds}s` : '—',
              color: 'var(--text-secondary)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
              <span
                className="text-[14px] font-semibold tabular-nums"
                style={{ color }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Data Quality ───────────────────────────────────────────── */}
      {businesses.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3"
            style={{ color: 'var(--text-faint)' }}
          >
            Data Quality
          </div>
          <div className="space-y-3">
            {qualityBars.map(({ label, pct: p }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                  <span
                    className="text-[12px] font-semibold tabular-nums"
                    style={{ color: barColor(p) }}
                  >
                    {p}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--border)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: barColor(p) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Source Reliability ─────────────────────────────────────── */}
      {sourceScores && Object.keys(sourceScores).length > 0 && (
        <div
          className="rounded-xl border"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setSourcesOpen(!sourcesOpen)}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-faint)' }}
            >
              Sources
            </span>
            {sourcesOpen ? (
              <ChevronUp size={13} strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
            ) : (
              <ChevronDown size={13} strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
            )}
          </button>

          <AnimatePresence initial={false}>
            {sourcesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="px-4 pb-4 space-y-2.5 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="pt-3" />
                  {Object.entries(sourceScores).map(([key, score]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {SOURCE_LABELS[key] ?? key}
                        </span>
                        <span
                          className="text-[11px] font-semibold tabular-nums"
                          style={{
                            color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--text-faint)',
                          }}
                        >
                          {score}
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ background: 'var(--border)' }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--text-faint)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: 'success' | 'warning'
}) {
  const bgColor = active
    ? color === 'success' ? 'rgba(34,197,94,0.1)' : color === 'warning' ? 'rgba(245,158,11,0.1)' : 'var(--accent-bg)'
    : 'var(--surface-card)'
  const borderColor = active
    ? color === 'success' ? 'rgba(34,197,94,0.3)' : color === 'warning' ? 'rgba(245,158,11,0.3)' : 'var(--border-hi)'
    : 'var(--border)'
  const textColor = active
    ? color === 'success' ? 'var(--success)' : color === 'warning' ? 'var(--warning)' : 'var(--text-primary)'
    : 'var(--text-muted)'

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2.5 py-1.5 transition border"
      style={{ background: bgColor, borderColor, color: textColor }}
    >
      {children}
    </button>
  )
}

// ── Business card ─────────────────────────────────────────────────────────

function BusinessCard({
  biz,
  expanded,
  onToggleEvidence,
}: {
  biz: BusinessResult
  expanded: boolean
  onToggleEvidence: () => void
}) {
  const statusConfig = {
    verified: { label: '● Verified', color: 'var(--success)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    partial:  { label: '⚠ Partial',  color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    conflict: { label: '⚡ Conflict', color: 'var(--error)',   bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
  }
  const status = statusConfig[biz.verification_status]
  const confPct = biz.confidence_score   // integer 0–100

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.005, y: -1 }}
      className="rounded-xl border transition group"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Row 1 — Header */}
      <div className="px-6 py-5 border-b flex items-start justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 text-[12px] font-medium rounded-md px-2 py-0.5"
            style={{
              color: biz.rank <= 3 ? 'var(--text-primary)' : 'var(--text-muted)',
              background: biz.rank <= 3 ? 'var(--accent-bg)' : 'var(--surface-card-hover)',
              border: biz.rank <= 3 ? '1px solid var(--border-hi)' : '1px solid transparent',
            }}
          >
            #{biz.rank}
          </span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a
                href={biz.website.value || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline transition"
                style={{ color: 'var(--text-primary)', fontSize: '18px' }}
              >
                {biz.business_name}
              </a>
              {biz.website.value && (
                <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
              )}
            </div>
            {biz.website.value && (
              <div className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {biz.website.value.replace(/^https?:\/\//, '')}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] font-medium px-2 py-1 rounded-md border"
            style={{ color: status.color, background: status.bg, borderColor: status.border }}
          >
            {status.label}
          </span>
          <span
            className="text-[14px] font-bold px-3 py-1.5 rounded-lg"
            style={{
              color: confPct >= 90 ? 'var(--success)' : confPct >= 70 ? 'var(--warning)' : 'var(--error)',
              background: 'var(--surface-card-hover)',
            }}
          >
            {confPct}%
          </span>
        </div>
      </div>

      {/* Row 2 — Contact grid */}
      <div className="px-4 md:px-6 py-4 md:py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex items-start gap-2">
          <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          {biz.address ? (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(biz.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] hover:underline transition"
              style={{ color: 'var(--text-secondary)' }}
            >
              {biz.address}
            </a>
          ) : (
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>—</span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <Star size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} strokeWidth={1.5} />
          <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {biz.rating} ({biz.review_count} reviews)
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Phone size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <div>
            {biz.phone.value ? (
              <a
                href={`tel:${biz.phone.value.replace(/\s/g, '')}`}
                className="text-[14px] hover:underline transition"
                style={{ color: 'var(--text-secondary)' }}
              >
                {biz.phone.value}
              </a>
            ) : (
              <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>—</span>
            )}
            {biz.phone.value && (
              <span className="text-[12px] ml-2" style={{ color: 'var(--text-faint)' }}>
                ✓ {biz.phone.sources} sources
              </span>
            )}
            {biz.phone.conflictValue && (
              <div className="text-[12px] mt-0.5" style={{ color: 'var(--warning)' }}>
                ⚠ Conflict: {biz.phone.conflictSource} shows {biz.phone.conflictValue}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Mail size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <div>
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {biz.email.value || '—'}
            </span>
            {biz.email.value && (
              <span className="text-[12px] ml-2" style={{ color: 'var(--text-faint)' }}>
                ✓ {biz.email.sources} sources
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <div>
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {biz.website.value ? biz.website.value.replace(/^https?:\/\//, '') : '—'}
            </span>
            {biz.website.value && (
              <span className="text-[12px] ml-2" style={{ color: 'var(--text-faint)' }}>
                ✓ {biz.website.sources} sources
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <div>
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {biz.working_hours.value || '—'}
            </span>
            {biz.working_hours.value && (
              <span className="text-[12px] ml-2" style={{ color: 'var(--text-faint)' }}>
                ✓ {biz.working_hours.sources} sources
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 3 — Services */}
      {biz.services.length > 0 && (
        <div className="px-6 pb-2 flex flex-wrap gap-1.5">
          {biz.services.slice(0, 5).map((s) => (
            <span
              key={s}
              className="text-[12px] px-2 py-0.5 rounded-md border"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
            >
              {s}
            </span>
          ))}
          {biz.services.length > 5 && (
            <span className="text-[12px] px-2 py-0.5 rounded-md" style={{ color: 'var(--text-muted)' }}>
              +{biz.services.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Row 3b — Certifications */}
      {biz.certifications.length > 0 && (
        <div className="px-6 pb-3 text-[12px]" style={{ color: 'var(--success)' }}>
          ✓ {biz.certifications.join(' · ')}
        </div>
      )}

      {/* Row 4 — License */}
      {biz.license_information && (
        <div className="px-6 pb-3 flex items-center gap-2">
          <Shield size={13} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <span className="font-mono-ui text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {biz.license_information.value}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            🏛 {biz.license_information.source}
          </span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--success)' }}>✓ Active</span>
        </div>
      )}

      {/* Row 5 — Footer */}
      <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from(
            new Set(
              Object.values(biz.source_urls || {})
                .map((url) => {
                  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
                })
                .filter(Boolean)
            )
          ).slice(0, 5).map((host) => (
            <span
              key={host as string}
              className="text-[11px] px-2 py-0.5 rounded-md border"
              style={{ color: 'var(--text-muted)', background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
            >
              {host}
            </span>
          ))}
        </div>
        <button
          onClick={onToggleEvidence}
          className="flex items-center gap-1.5 text-[13px] font-medium transition hover:underline"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          View evidence
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} strokeWidth={2} />
          </motion.div>
        </button>
      </div>

      {/* Evidence expand panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 py-4 border-t"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-panel)' }}
            >
              <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Evidence for {biz.business_name}
              </div>
              <div className="space-y-2 text-[12px] font-mono-ui">
                <EvidenceRow label="Phone"         value={biz.phone.value}         links={biz.phone.links} />
                <EvidenceRow label="Email"         value={biz.email.value}         links={biz.email.links} />
                <EvidenceRow label="Working Hours" value={biz.working_hours.value} links={biz.working_hours.links} />
                <EvidenceRow
                  label="License"
                  value={biz.license_information?.value}
                  links={biz.license_information?.link ? [biz.license_information.link] : []}
                />
                {Object.keys(biz.source_urls || {}).length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      All sources
                    </div>
                    <div className="space-y-1">
                      {Object.entries(biz.source_urls || {}).map(([field, url]) => (
                        <div key={field} className="flex items-baseline gap-2">
                          <span
                            className="shrink-0 text-[11px] px-1.5 py-0.5 rounded capitalize"
                            style={{ color: 'var(--text-muted)', background: 'var(--surface-card)' }}
                          >
                            {field.replace(/_/g, ' ')}
                          </span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:underline"
                            style={{ color: 'var(--text-faint)', maxWidth: '480px' }}
                          >
                            {url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Evidence row ──────────────────────────────────────────────────────────

function EvidenceRow({ label, value, links }: { label: string; value?: string; links?: string[] }) {
  if (!value) return null
  return (
    <div>
      <div className="font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}: {value}
      </div>
      <div className="pl-4 space-y-0.5">
        {links?.map((link, i) => (
          <div key={i} className="flex items-center gap-1">
            <Check size={10} style={{ color: 'var(--success)' }} strokeWidth={1.5} />
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {link}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
