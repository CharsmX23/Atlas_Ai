'use client'

import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, Plus, Clock, Trash2, X } from 'lucide-react'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Initial fetch
  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data || [])
        setLoading(false)
      })
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        (payload) => {
          const row = payload.new as Project
          setProjects((prev) => {
            // Skip if already exists (optimistic update already added it)
            if (prev.some((p) => p.id === row.id)) return prev
            return [row, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects((prev) => prev.filter((p) => p.id !== (payload.old as Project).id))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects((prev) =>
            prev.map((p) => (p.id === (payload.new as Project).id ? (payload.new as Project) : p))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Focus name input when modal opens
  useEffect(() => {
    if (creating) {
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [creating])

  function openCreate() {
    setNewName('')
    setNewDesc('')
    setCreating(true)
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setSubmitting(true)

    // Optimistic insert
    const tempId = `__temp__${Date.now()}`
    const optimistic: Project = {
      id: tempId,
      name,
      description: newDesc.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProjects((prev) => [optimistic, ...prev])
    setCreating(false)

    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description: newDesc.trim() || null })
      .select()
      .single()

    if (error || !data) {
      // Roll back optimistic insert
      setProjects((prev) => prev.filter((p) => p.id !== tempId))
    } else {
      // Swap temp id for real row
      setProjects((prev) => prev.map((p) => (p.id === tempId ? data : p)))
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null)
    // Optimistic remove
    setProjects((prev) => prev.filter((p) => p.id !== id))
    await supabase.from('projects').delete().eq('id', id)
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-[26px] mb-1"
              style={{
                fontFamily: 'var(--font-serif-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Projects
            </h1>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Saved research collections
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 border rounded-lg px-4 py-2 text-[14px] font-medium transition"
            style={{
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
              background: 'var(--surface-card)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-hi)'
              e.currentTarget.style.background = 'var(--surface-card-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--surface-card)'
            }}
          >
            <Plus size={15} strokeWidth={1.5} />
            New project
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border p-5 animate-pulse h-[140px]"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center border"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
            >
              <FolderOpen size={24} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                No projects yet
              </p>
              <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                Create your first project to organize research
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 border rounded-lg px-4 py-2 text-[14px] font-medium transition"
              style={{
                color: 'var(--text-primary)',
                borderColor: 'var(--border)',
                background: 'var(--surface-card)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hi)'
                e.currentTarget.style.background = 'var(--surface-card-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--surface-card)'
              }}
            >
              <Plus size={15} strokeWidth={1.5} />
              New project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {projects.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative group rounded-xl border p-5 transition cursor-pointer"
                  style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <Link href={`/projects/${p.id}`} className="block">
                    <FolderOpen
                      size={20}
                      className="mb-3"
                      strokeWidth={1.5}
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <div
                      className="text-[16px] font-semibold mb-1 leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.name}
                    </div>
                    {p.description && (
                      <div
                        className="text-[13px] mb-4 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {p.description}
                      </div>
                    )}
                    <div
                      className="flex items-center gap-1 text-[12px] mt-3"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <Clock size={11} strokeWidth={1.5} />
                      {timeAgo(p.created_at)}
                    </div>
                  </Link>

                  {/* Delete button — visible on hover */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setConfirmDeleteId(p.id)
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-faint)', background: 'var(--surface-panel)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                    title="Delete project"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Create project modal ──────────────────────────────────────── */}
        <AnimatePresence>
          {creating && (
            <>
              {/* Backdrop */}
              <motion.div
                key="create-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                onClick={() => setCreating(false)}
              />
              {/* Modal */}
              <motion.div
                key="create-modal"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2
                    className="text-[18px] font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    New project
                  </h2>
                  <button
                    onClick={() => setCreating(false)}
                    className="p-1.5 rounded-lg transition"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-[13px] font-medium mb-1.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Project name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                      placeholder="e.g. Healthcare Birmingham"
                      className="w-full rounded-lg border px-3 py-2 text-[14px] outline-none transition"
                      style={{
                        background: 'var(--surface-panel)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[13px] font-medium mb-1.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Description <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
                    </label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="What research does this project cover?"
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2 text-[14px] outline-none transition resize-none"
                      style={{
                        background: 'var(--surface-panel)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || submitting}
                    className="flex-1 rounded-lg py-2 text-[14px] font-medium transition"
                    style={{
                      background: newName.trim() ? 'var(--text-primary)' : 'var(--surface-card-hover)',
                      color: newName.trim() ? 'var(--bg)' : 'var(--text-faint)',
                      cursor: newName.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {submitting ? 'Creating...' : 'Create project'}
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="flex-1 rounded-lg border py-2 text-[14px] font-medium transition"
                    style={{
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Delete confirmation modal ─────────────────────────────────── */}
        <AnimatePresence>
          {confirmDeleteId && (
            <>
              <motion.div
                key="delete-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                onClick={() => setConfirmDeleteId(null)}
              />
              <motion.div
                key="delete-modal"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.15 }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 text-center"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <Trash2 size={16} strokeWidth={1.5} style={{ color: 'var(--error)' }} />
                </div>
                <h3
                  className="text-[16px] font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Delete this project?
                </h3>
                <p
                  className="text-[13px] mb-6"
                  style={{ color: 'var(--text-muted)' }}
                >
                  This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDelete(confirmDeleteId)}
                    className="flex-1 rounded-lg py-2 text-[14px] font-medium transition"
                    style={{ background: 'var(--error)', color: '#fff' }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 rounded-lg border py-2 text-[14px] font-medium transition"
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  )
}
