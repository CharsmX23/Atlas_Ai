'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export const ALL_SOURCES = [
  'Discovering local businesses',
  'Enriching contact details',
  'Verifying & scoring results',
  'Ranking by confidence',
]

export const SOURCE_BACKEND_KEYS: Record<string, string> = {
  'Discovering local businesses': 'serper_places',
  'Enriching contact details':    'google_places',
  'Verifying & scoring results':  'confidence_scoring',
  'Ranking by confidence':        'ranking',
}

export const CACHE_TTL_OPTIONS = ['1h', '6h', '12h', '1d', '2d', '7d']

interface AppSettings {
  displayName: string
  mode: 'deep' | 'fast'
  sources: string[]
  cacheTtl: string
}

interface SettingsContextType {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  saveSettings: (extraKey?: string, extraValue?: unknown) => Promise<boolean>
  saving: boolean
  loaded: boolean
}

const DEFAULTS: AppSettings = {
  displayName: 'Research Team',
  mode: 'deep',
  sources: ALL_SOURCES,
  cacheTtl: '2d',
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULTS,
  updateSettings: () => {},
  saveSettings: async () => false,
  saving: false,
  loaded: false,
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('user_settings')
      .select('key, value')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map: Record<string, unknown> = {}
          data.forEach((row) => { map[row.key] = row.value })
          setSettings({
            displayName: typeof map.display_name === 'string' ? map.display_name : DEFAULTS.displayName,
            mode: (map.research_mode as 'deep' | 'fast') ?? DEFAULTS.mode,
            sources: Array.isArray(map.default_sources) ? (map.default_sources as string[]) : DEFAULTS.sources,
            cacheTtl: typeof map.cache_ttl === 'string' ? map.cache_ttl : DEFAULTS.cacheTtl,
          })
        }
        setLoaded(true)
      }, () => setLoaded(true))
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const saveSettings = useCallback(async (extraKey?: string, extraValue?: unknown): Promise<boolean> => {
    setSaving(true)
    const now = new Date().toISOString()
    const rows: { key: string; value: unknown; updated_at: string }[] = [
      { key: 'display_name',    value: settings.displayName, updated_at: now },
      { key: 'research_mode',   value: settings.mode,        updated_at: now },
      { key: 'default_sources', value: settings.sources,     updated_at: now },
      { key: 'cache_ttl',       value: settings.cacheTtl,    updated_at: now },
    ]
    if (extraKey !== undefined) {
      rows.push({ key: extraKey, value: extraValue, updated_at: now })
    }
    const { error } = await supabase.from('user_settings').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    return !error
  }, [settings])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, saving, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
