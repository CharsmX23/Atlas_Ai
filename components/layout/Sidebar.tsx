'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import {
  Search,
  FolderOpen,
  Bot,
  Network,
  FileText,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  Moon,
  Sun,
} from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { label: 'Research', href: '/research', icon: Search },
  { label: 'Projects', href: '/projects', icon: FolderOpen, badge: '3' },
  { label: 'Agents', href: '/agents', icon: Bot, badge: '12' },
  { label: 'Knowledge graph', href: '/knowledge-graph', icon: Network },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <aside
      className="flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        width: collapsed ? 72 : 250,
        transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--surface-panel)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Brand row — compact */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <div
            className="leading-tight tracking-[-0.025em]"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '18px',
              color: 'var(--text-primary)',
            }}
          >
            {collapsed ? 'A' : 'Atlas AI'}
          </div>
          {!collapsed && (
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
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 p-1.5 rounded-lg transition-all duration-150"
          style={{
            color: 'var(--text-muted)',
            marginRight: collapsed ? 'auto' : '0',
            marginLeft: collapsed ? 'auto' : '0',
          }}
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
      </div>

      {/* Divider after brand */}
      <div className="mx-4 mb-2 border-t" style={{ borderColor: 'var(--border)' }} />

      {/* Nav — no overflow */}
      <nav className="flex-1 flex flex-col justify-start px-3 py-1 overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center rounded-lg transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'}
              `}
              style={isActive
                ? {
                    background: 'var(--accent-bg)',
                    color: 'var(--text-primary)',
                  }
                : {
                    color: 'var(--text-muted)',
                  }
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
              {/* LEFT ACCENT LINE — only on active */}
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 rounded-full"
                  style={{ width: '3px', background: 'var(--text-primary)' }}
                />
              )}
              <item.icon size={18} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && (
                <span className="text-[14px] font-medium truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span
                  className="ml-auto text-[11px] rounded-full px-1.5 py-0.5 border"
                  style={{
                    color: 'var(--text-faint)',
                    background: 'var(--surface-card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle — compact */}
      <div className={`shrink-0 px-3 pb-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface-card)' }}>
          {!collapsed && (
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="relative flex items-center rounded-full transition-all duration-300"
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

      {/* User profile — compact */}
      <div className="shrink-0 p-2 pb-2">
        <button
          className={`w-full flex items-center rounded-xl p-2.5 transition-all group ${collapsed ? 'justify-center' : 'gap-3'}`}
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
            OC
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  Research Team
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  Chettinad CodeFest 2026
                </div>
              </div>
              <MoreHorizontal
                size={15}
                strokeWidth={1.5}
                style={{ color: 'var(--text-faint)' }}
              />
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
