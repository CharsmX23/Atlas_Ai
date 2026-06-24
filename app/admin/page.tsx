'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

export default function Admin() {
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [jobCount, setJobCount] = useState<number | null>(null)
  const [businessCount, setBusinessCount] = useState<number | null>(null)

  useEffect(() => {
    // Counts
    supabase
      .from('research_jobs')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setJobCount(count ?? 0))

    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setBusinessCount(count ?? 0))

    // Last 20 agent events
    supabase
      .from('agent_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setRecentEvents(data || []))

    // Subscribe to new events
    const channel = supabase
      .channel('admin-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_events' },
        (payload) => {
          setRecentEvents((prev) => [payload.new, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const statCards = [
    { label: 'Total jobs', value: jobCount ?? '—' },
    { label: 'Businesses indexed', value: businessCount ?? '—' },
    { label: 'Backend status', value: '● Online', green: true },
  ]

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Admin</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>System health and live activity</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl p-5 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
              <div
                className="text-[28px] font-semibold font-variant-tnum"
                style={{ color: s.green ? 'var(--success)' : 'var(--text-primary)' }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Live event log */}
        <div className="rounded-xl border p-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Live Agent Events</h2>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-warm" style={{ background: 'var(--success)' }} />
          </div>
          <div className="space-y-0 font-mono-ui text-[12px] max-h-96 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-[13px] py-4" style={{ color: 'var(--text-muted)' }}>No events yet. Run a research mission.</p>
            ) : (
              recentEvents.map((event, i) => (
                <div
                  key={event.id ?? i}
                  className="flex gap-3 py-2 leading-relaxed"
                  style={{ borderBottom: i < recentEvents.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span className="shrink-0" style={{ color: 'var(--text-faint)' }}>
                    {new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span
                    className="shrink-0"
                    style={{
                      color:
                        event.status === 'done'
                          ? 'var(--success)'
                          : event.status === 'warn'
                          ? 'var(--warning)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    [{event.agent_name || 'system'}]
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{event.title}</span>
                  {event.subtitle && (
                    <span style={{ color: 'var(--text-faint)' }}>{event.subtitle}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
