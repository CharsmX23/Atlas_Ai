'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { useState } from 'react'

const sources = [
  'Google Search', 'Healthgrades', 'Yelp', 'LinkedIn', 'Yellow Pages',
  'Facebook', 'BBB Verifier', 'Government License DB', 'Website Detail',
  'Image Collector', 'Avvo / Justia', 'Quality Auditor',
]

export default function Settings() {
  const [displayName, setDisplayName] = useState('OCTS Demo')
  const [mode, setMode] = useState<'deep' | 'fast'>('deep')
  const [selectedSources, setSelectedSources] = useState<string[]>(sources)
  const [cacheTtl, setCacheTtl] = useState(48)

  const toggleSource = (s: string) => {
    setSelectedSources((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="p-8 max-w-[800px]">
        <h1 className="text-[26px] mb-1" style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Settings</h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--text-secondary)' }}>Configure your Atlas research environment</p>

        <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="text-[14px] mb-0.5" style={{ color: 'var(--text-primary)' }}>Display name</div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>How you appear in the workspace</div>
            </div>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-md px-3 py-2 text-[13px] outline-none w-[200px]"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>

          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="text-[14px] mb-0.5" style={{ color: 'var(--text-primary)' }}>Default research mode</div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>Preferred depth for new queries</div>
            </div>
            <div className="inline-flex items-center rounded-lg overflow-hidden" style={{ background: 'var(--bg)' }}>
              <button onClick={() => setMode('deep')} className="px-3 py-1.5 text-[12px] font-medium transition"
                style={mode === 'deep' ? { background: 'var(--text-primary)', color: 'var(--bg)' } : { color: 'var(--text-muted)' }}>Deep</button>
              <button onClick={() => setMode('fast')} className="px-3 py-1.5 text-[12px] font-medium transition"
                style={mode === 'fast' ? { background: 'var(--text-primary)', color: 'var(--bg)' } : { color: 'var(--text-muted)' }}>Fast</button>
            </div>
          </div>

          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[14px] mb-0.5" style={{ color: 'var(--text-primary)' }}>Default sources</div>
                <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>Which agents to use for research</div>
              </div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>{selectedSources.length} of {sources.length} selected</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <button key={s} onClick={() => toggleSource(s)} className="text-[12px] px-2.5 py-1 rounded-md border transition"
                  style={selectedSources.includes(s)
                    ? { background: 'var(--accent-bg)', borderColor: 'var(--border-hi)', color: 'var(--text-primary)' }
                    : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-faint)' }
                  }>{s}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="text-[14px] mb-0.5" style={{ color: 'var(--text-primary)' }}>Cache TTL</div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>How long to keep cached results</div>
            </div>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={168} step={1} value={cacheTtl} onChange={(e) => setCacheTtl(Number(e.target.value))} className="w-[120px] accent-white" />
              <span className="text-[13px] font-variant-tnum w-[60px]" style={{ color: 'var(--text-secondary)' }}>{cacheTtl >= 24 ? `${Math.round(cacheTtl / 24)}d` : `${cacheTtl}h`}</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="text-[14px] mb-0.5" style={{ color: 'var(--text-primary)' }}>Theme</div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>Visual appearance</div>
            </div>
            <div className="text-[13px] px-3 py-1.5 rounded-md cursor-not-allowed" style={{ color: 'var(--text-faint)', background: 'var(--bg)', border: '1px solid var(--border)' }}>Dark</div>
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-[14px] mb-0.5" style={{ color: 'var(--text-primary)' }}>Data sources</div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>How Atlas collects data</div>
            </div>
            <div className="text-[12px] px-3 py-1.5 rounded-md font-medium" style={{ color: 'var(--success)', background: 'rgba(34,197,94,0.08)' }}>Uses only open-source data sources — no paid APIs</div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button className="font-medium px-5 py-2.5 rounded-lg transition text-[14px]" style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>Save changes</button>
        </div>
      </motion.div>
    </AppLayout>
  )
}
