'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import { useSettings } from '@/lib/settings-context'
import {
  Search,
  FolderOpen,
  FileText,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  Moon,
  Sun,
  ShieldCheck,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { label: 'Research',  href: '/research',  icon: Search },
  { label: 'Projects',  href: '/projects',  icon: FolderOpen },
  { label: 'Reports',   href: '/reports',   icon: FileText },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Admin',     href: '/admin',     icon: ShieldCheck },
  { label: 'Settings',  href: '/settings',  icon: Settings },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { settings } = useSettings()

  const displayName = settings.displayName || 'Research Team'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <aside
      className={[
        // Mobile: fixed overlay, controlled by mobileOpen
        'fixed inset-y-0 left-0 z-50 w-[260px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Tablet (md): normal flow, always icon-only (48px), always visible
        'md:relative md:inset-auto md:z-auto md:translate-x-0 md:w-12',
        // Desktop (lg): collapsible
        !collapsed ? 'lg:w-[250px]' : 'lg:w-[72px]',
        'flex flex-col h-screen shrink-0 overflow-hidden',
        'transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
      ].join(' ')}
      style={{
        background: 'var(--surface-panel)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Brand row ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 pt-4 pb-2">
        {/* "Atlas AI" — mobile always, desktop when not collapsed */}
        <div className={`min-w-0 ${collapsed ? 'lg:hidden' : 'lg:block'} md:hidden`}>
          <div
            className="leading-tight tracking-[-0.025em] truncate"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '18px',
              color: 'var(--text-primary)',
            }}
          >
            Atlas AI
          </div>
          <div
            className="mt-1"
            style={{
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.10em',
              color: 'var(--text-muted)',
              lineHeight: '1.4',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Autonomous<br />Intelligence
          </div>
        </div>

        {/* "A" — tablet always, desktop when collapsed */}
        <div
          className={`hidden md:flex items-center justify-center w-full ${!collapsed ? 'lg:hidden' : ''}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '18px',
            color: 'var(--text-primary)',
          }}
        >
          A
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 hidden lg:flex p-1.5 rounded-lg transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen size={15} strokeWidth={1.5} />
          ) : (
            <PanelLeftClose size={15} strokeWidth={1.5} />
          )}
        </button>

        {/* Close button — mobile only */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close navigation"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-2 border-t" style={{ borderColor: 'var(--border)' }} />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col justify-start px-2 py-1 overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onMobileClose}
              className={`
                relative flex items-center rounded-lg transition-all duration-150 min-h-[44px]
                justify-center md:justify-center lg:justify-start
                px-0 md:px-0 lg:px-3
                ${!collapsed ? 'lg:gap-3' : 'lg:justify-center lg:px-0'}
              `}
              style={
                isActive
                  ? { background: 'var(--accent-bg)', color: 'var(--text-primary)' }
                  : { color: 'var(--text-muted)' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.background = 'var(--surface-card)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 rounded-full"
                  style={{ width: '3px', background: 'var(--text-primary)' }}
                />
              )}
              <item.icon size={18} strokeWidth={1.5} className="shrink-0" />
              {/* Label: mobile always, tablet hidden, desktop depends on collapsed */}
              <span
                className={`text-[14px] font-medium truncate md:hidden ${!collapsed ? 'lg:block' : 'lg:hidden'}`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Theme toggle ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-2 pb-2">
        <div
          className="flex items-center justify-between px-2 py-2 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-card)' }}
        >
          {/* Label: mobile + desktop expanded only */}
          <span
            className={`text-[12px] font-medium md:hidden ${!collapsed ? 'lg:block' : 'lg:hidden'}`}
            style={{ color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <button
            onClick={toggleTheme}
            className="relative flex items-center rounded-full transition-all duration-300 mx-auto md:mx-auto lg:mx-0"
            style={{ width: '40px', height: '20px', background: 'var(--surface-card-hover)', border: '1px solid var(--border)' }}
            aria-label="Toggle theme"
          >
            <motion.div
              layout
              className="absolute top-[1px] bottom-[1px] w-[16px] rounded-full flex items-center justify-center"
              style={{ background: 'var(--text-primary)' }}
              animate={{ left: theme === 'light' ? '21px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {theme === 'dark' ? (
                <Moon size={8} style={{ color: 'var(--bg)' }} />
              ) : (
                <Sun size={8} style={{ color: 'var(--bg)' }} />
              )}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t" style={{ borderColor: 'var(--border)' }} />

      {/* ── User profile ─────────────────────────────────────────────── */}
      <div className="shrink-0 p-2">
        <div
          className="w-full flex items-center rounded-xl p-2 transition-all group cursor-pointer
            justify-center md:justify-center lg:justify-start
            gap-0 lg:gap-3"
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-card)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold border"
            style={{
              background: 'var(--surface-card-hover)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
            }}
          >
            {initials || 'RT'}
          </div>
          {/* Name area: mobile always, tablet hidden, desktop expanded only */}
          <div
            className={`flex-1 text-left min-w-0 md:hidden ${!collapsed ? 'lg:block' : 'lg:hidden'}`}
          >
            <div className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              Atlas AI Workspace
            </div>
          </div>
          <MoreHorizontal
            size={15}
            strokeWidth={1.5}
            style={{ color: 'var(--text-faint)' }}
            className={`shrink-0 md:hidden ${!collapsed ? 'lg:block' : 'lg:hidden'}`}
          />
        </div>
      </div>
    </aside>
  )
}
