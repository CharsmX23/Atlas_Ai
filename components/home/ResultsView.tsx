'use client'

import { useState, useMemo } from 'react'
import { mockResults, type BusinessResult } from './constants'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Phone, Mail, Globe, Clock, Star, ExternalLink, ChevronDown, ChevronUp, Check, AlertTriangle, Shield, X } from 'lucide-react'

interface Props {
  onReset: () => void
  onNewMission: () => void
  results?: BusinessResult[] | null
}

export function ResultsView({ onReset, onNewMission, results }: Props) {
  // Use real backend results when available, otherwise fall back to mock data
  const baseResults = results && results.length > 0 ? results : mockResults
  const [sortBy, setSortBy] = useState<'confidence' | 'rating' | 'name'>('confidence')
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'partial' | 'conflict'>('all')
  const [showVerified, setShowVerified] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)
  const [showHasWebsite, setShowHasWebsite] = useState(false)
  const [showHasPhone, setShowHasPhone] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...baseResults]
    if (filterStatus !== 'all') list = list.filter((b) => b.verification_status === filterStatus)
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
  }, [baseResults, sortBy, filterStatus, showVerified, showConflicts, showHasWebsite, showHasPhone, nameFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Filters bar */}
      <div className="shrink-0 border-b px-6 py-3 flex items-center gap-4 z-10" style={{ background: 'var(--surface-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span>{filtered.length} businesses found</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="flex items-center gap-1">
            Sort:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
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
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
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

      {/* Results scroll area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto space-y-3" style={{ maxWidth: '1400px' }}>
          {filtered.map((biz) => (
            <BusinessCard
              key={biz.business_name}
              biz={biz}
              expanded={expandedEvidence === biz.business_name}
              onToggleEvidence={() => setExpandedEvidence(expandedEvidence === biz.business_name ? null : biz.business_name)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: 'success' | 'warning' }) {
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

function BusinessCard({ biz, expanded, onToggleEvidence }: { biz: BusinessResult; expanded: boolean; onToggleEvidence: () => void }) {
  const statusConfig = {
    verified: { label: '● Verified', color: 'var(--success)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    partial: { label: '⚠ Partial', color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    conflict: { label: '⚡ Conflict', color: 'var(--error)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  }
  const status = statusConfig[biz.verification_status]
  const confPct = Math.round(biz.confidence_score * 100)

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
      <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-2">
        <div className="flex items-start gap-2">
          <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{biz.address}</span>
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
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{biz.phone.value || '—'}</span>
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
        <div className="px-6 pb-3 flex flex-wrap gap-1.5">
          {biz.services.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-[12px] px-2 py-0.5 rounded-md border"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
            >
              {s}
            </span>
          ))}
          {biz.services.length > 4 && (
            <span className="text-[12px] px-2 py-0.5 rounded-md" style={{ color: 'var(--text-muted)' }}>
              +{biz.services.length - 4} more
            </span>
          )}
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {['Google', 'Healthgrades', 'Yelp', 'LinkedIn', 'Website'].map((src) => (
            <span
              key={src}
              className="text-[11px] px-2 py-0.5 rounded-md border"
              style={{ color: 'var(--text-muted)', background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
            >
              {src}
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
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
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
            <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface-panel)' }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Evidence for {biz.business_name}
              </div>
              <div className="space-y-2 text-[12px] font-mono-ui">
                <EvidenceRow label="Phone" value={biz.phone.value} links={biz.phone.links} />
                <EvidenceRow label="Email" value={biz.email.value} links={biz.email.links} />
                <EvidenceRow label="Working Hours" value={biz.working_hours.value} links={[biz.source_urls.working_hours].filter(Boolean)} />
                <EvidenceRow label="License" value={biz.license_information?.value} links={[biz.source_urls.certifications].filter(Boolean)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function EvidenceRow({ label, value, links }: { label: string; value?: string; links?: string[] }) {
  if (!value) return null
  return (
    <div>
      <div className="font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}: {value}</div>
      <div className="pl-4 space-y-0.5">
        {links?.map((link, i) => (
          <div key={i} className="flex items-center gap-1">
            <Check size={10} style={{ color: 'var(--success)' }} strokeWidth={1.5} />
            <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" style={{ color: 'var(--text-muted)' }}>
              {link}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
