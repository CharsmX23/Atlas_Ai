'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Read from localStorage on mount (synchronous, prevents flash alongside the inline script)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('atlas-theme') as Theme | null
      if (saved === 'dark' || saved === 'light') {
        setThemeState(saved)
        return
      }
    } catch {}
    // Fallback: read from Supabase
    supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'theme')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value === 'light' || data?.value === 'dark') {
          setThemeState(data.value as Theme)
        }
      }, () => {})
  }, [])

  // Apply to DOM + persist to localStorage whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('atlas-theme', theme) } catch {}
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    // Persist to Supabase (fire and forget)
    supabase
      .from('user_settings')
      .upsert({ key: 'theme', value: t, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .then(() => {}, () => {})
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
