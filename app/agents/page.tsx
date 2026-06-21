'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { Search, Globe, Briefcase, Shield, FileCheck, ClipboardCheck, ClipboardList, Cpu, Activity, Zap, HardDrive, AlertTriangle } from 'lucide-react'
import { supabase, type AgentRegistry } from '@/lib/supabase'

const iconMap: Record<string, React.ComponentType<any>> = {
  Search, Globe, Briefcase, Shield, FileCheck, ClipboardCheck, ClipboardList, Cpu, Activity, Zap, HardDrive, AlertTriangle,
}

function AgentCard({ agent }: { agent: AgentRegistry }) {
  const Icon = iconMap[agent.icon] || Search
  const statusColor = agent.status === 'online' ? 'var(--success)' : agent.status === 'degraded' ? 'var(--warning)' : 'var(--error)'
  const barColor = agent.reliability >= 90 ? 'var(--success)' : agent.reliability >= 80 ? 'var(--warning)' : 'var(--error)'

  return (
    <div className="rounded-xl p-5 border transition hover:brightness-105" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${agent.icon_color}18` }}>
          <Icon size={20} color={agent.icon_color} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{agent.source}</div>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
        <span className="text-[12px] font-medium capitalize" style={{ color: statusColor }}>{agent.status}</span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: 'var(--text-faint)' }}>
          <span>Reliability</span>
          <span className="font-variant-tnum">{agent.reliability}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full" style={{ width: `${agent.reliability}%`, background: barColor }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px]" style={{ color: 'var(--text-faint)' }}>
        <span className="font-variant-tnum">{agent.jobs} jobs</span>
        <span className="font-variant-tnum">{agent.latency_ms}ms</span>
      </div>
    </div>
  )
}

export default function Agents() {
  const [agents, setAgents] = useState<AgentRegistry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAgents() {
      try {
        const { data, error } = await supabase
          .from('agent_registry')
          .select('*')
          .order('name', { ascending: true })
        if (error) throw error
        setAgents(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load agents')
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
  }, [])

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Agents</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>{agents.length} specialized workers powering Atlas research</p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
              <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
              Loading agents...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[14px]" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  )
}
