'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings, ALL_SOURCES, CACHE_TTL_OPTIONS } from '@/lib/settings-context'
import { useTheme } from '@/components/theme-provider'
import { Check, Loader2, Sun, Moon } from 'lucide-react'

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl"
      style={{
        background: 'var(--surface-card)',
        borderColor: type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        color: type === 'success' ? 'var(--success)' : 'var(--error)',
        minWidth: '220px',
      }}
    >
      {type === 'success' ? <Check size={15} strokeWidth={2} /> : null}
      <span className="text-[14px] font-medium">{message}</span>
    </motion.div>
  )
}

// ── Section row wrapper ───────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  children,
  stacked,
}: {
  label: string
  description?: string
  children: React.ReactNode
  stacked?: boolean
}) {
  return (
    <div
      className={`border-b py-5 px-5 md:px-8 ${stacked ? 'space-y-4' : 'flex flex-col md:flex-row md:items-center md:justify-between gap-4'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="shrink-0 md:max-w-[320px]">
        <div className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{description}</div>
        )}
      </div>
      <div className={stacked ? '' : 'md:flex-1 md:flex md:justify-end'}>{children}</div>
    </div>
  )
}

export default function Settings() {
  const { settings, updateSettings, saveSettings, saving } = useSettings()
  const { theme, setTheme } = useTheme()

  // Local copies so we can batch-save and show dirty state
  const [displayName, setDisplayName] = useState(settings.displayName)
  const [mode, setMode] = useState(settings.mode)
  const [selectedSources, setSelectedSources] = useState(settings.sources)
  const [cacheTtl, setCacheTtl] = useState(settings.cacheTtl)
  const [localTheme, setLocalTheme] = useState(theme)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Sync local state when settings load from Supabase
  useEffect(() => {
    setDisplayName(settings.displayName)
    setMode(settings.mode)
    setSelectedSources(settings.sources)
    setCacheTtl(settings.cacheTtl)
  }, [settings.displayName, settings.mode, settings.sources, settings.cacheTtl])

  useEffect(() => { setLocalTheme(theme) }, [theme])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    // Commit local state to context before saving
    updateSettings({ displayName, mode, sources: selectedSources, cacheTtl })
    // Apply theme immediately
    if (localTheme !== theme) setTheme(localTheme)

    const ok = await saveSettings('theme', localTheme)
    if (ok) {
      showToast('Settings saved', 'success')
    } else {
      showToast('Failed to save settings. Try again.', 'error')
    }
  }

  const toggleSource = (s: string) => {
    setSelectedSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const ttlIndex = CACHE_TTL_OPTIONS.indexOf(cacheTtl)

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Page header */}
        <div className="border-b px-5 md:px-8 py-6" style={{ borderColor: 'var(--border)' }}>
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
            Settings
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Configure your Atlas research environment
          </p>
        </div>

        {/* ── Settings rows ─────────────────────────────────────────────── */}
        <div
          className="border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Display name */}
          <SettingRow label="Display name" description="How you appear in the workspace">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="rounded-lg border px-3 py-2.5 text-[15px] outline-none transition w-full md:w-[240px] min-h-[44px]"
              style={{
                background: 'var(--surface-panel)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                fontSize: '16px',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </SettingRow>

          {/* Research mode */}
          <SettingRow label="Default research mode" description="Preferred depth for new queries">
            <div
              className="inline-flex items-center rounded-lg overflow-hidden border"
              style={{ background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
            >
              {(['deep', 'fast'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-5 py-2.5 text-[14px] font-medium transition capitalize min-h-[44px]"
                  style={
                    mode === m
                      ? { background: 'var(--text-primary)', color: 'var(--bg)' }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </SettingRow>

          {/* Default sources */}
          <SettingRow
            label="Default sources"
            description={`Which agents to use for research — ${selectedSources.length} of ${ALL_SOURCES.length} selected`}
            stacked
          >
            <div className="flex flex-wrap gap-2">
              {ALL_SOURCES.map((s) => {
                const active = selectedSources.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSource(s)}
                    className="text-[13px] px-3 py-2 rounded-lg border transition min-h-[44px]"
                    style={
                      active
                        ? { background: 'var(--accent-bg)', borderColor: 'var(--border-hi)', color: 'var(--text-primary)' }
                        : { background: 'var(--surface-panel)', borderColor: 'var(--border)', color: 'var(--text-faint)' }
                    }
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </SettingRow>

          {/* Cache TTL */}
          <SettingRow label="Cache TTL" description="How long to keep cached results">
            <div className="flex flex-col gap-2 w-full md:w-[240px]">
              <input
                type="range"
                min={0}
                max={CACHE_TTL_OPTIONS.length - 1}
                step={1}
                value={ttlIndex >= 0 ? ttlIndex : 4}
                onChange={(e) => setCacheTtl(CACHE_TTL_OPTIONS[Number(e.target.value)])}
                className="w-full accent-white h-2"
                style={{ minHeight: '44px' }}
              />
              <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--text-faint)' }}>
                {CACHE_TTL_OPTIONS.map((t, i) => (
                  <span
                    key={t}
                    className="text-center"
                    style={{ color: cacheTtl === t ? 'var(--text-primary)' : 'var(--text-faint)', fontWeight: cacheTtl === t ? 600 : 400 }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </SettingRow>

          {/* Theme */}
          <SettingRow label="Theme" description="Visual appearance">
            <div
              className="inline-flex items-center rounded-lg overflow-hidden border"
              style={{ background: 'var(--surface-panel)', borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => setLocalTheme('dark')}
                className="flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium transition min-h-[44px]"
                style={
                  localTheme === 'dark'
                    ? { background: 'var(--text-primary)', color: 'var(--bg)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                <Moon size={14} strokeWidth={1.5} />
                Dark
              </button>
              <button
                onClick={() => setLocalTheme('light')}
                className="flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium transition min-h-[44px]"
                style={
                  localTheme === 'light'
                    ? { background: 'var(--text-primary)', color: 'var(--bg)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                <Sun size={14} strokeWidth={1.5} />
                Light
              </button>
            </div>
          </SettingRow>

          {/* Data sources — info row */}
          <SettingRow label="Data sources" description="How Atlas collects data">
            <span
              className="text-[13px] px-3 py-1.5 rounded-md font-medium"
              style={{ color: 'var(--success)', background: 'rgba(34,197,94,0.08)' }}
            >
              Open-source only — no paid APIs
            </span>
          </SettingRow>
        </div>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4 px-5 md:px-8 py-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2.5 font-medium px-6 py-2.5 rounded-lg transition text-[14px] min-h-[44px]"
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            ) : (
              <Check size={15} strokeWidth={2} />
            )}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </AppLayout>
  )
}
