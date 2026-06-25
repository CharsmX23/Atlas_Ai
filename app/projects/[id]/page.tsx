'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
      .then(
        ({ data }) => { setProject(data); setLoading(false) },
        () => setLoading(false)   // table may not exist yet — show "not found" state
      )
  }, [id])

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="p-8"
      >
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-[13px] mb-8 transition"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to projects
        </Link>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-7 w-1/3 rounded" style={{ background: 'var(--border)' }} />
            <div className="h-4 w-1/2 rounded" style={{ background: 'var(--border)' }} />
          </div>
        ) : project ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen size={22} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
              <h1
                className="text-[26px]"
                style={{
                  fontFamily: 'var(--font-serif-display)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {project.name}
              </h1>
            </div>
            {project.description && (
              <p className="text-[15px] mt-1 mb-8" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
            )}
            <div
              className="rounded-xl border p-10 flex flex-col items-center justify-center text-center"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}
            >
              <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Research results coming soon
              </p>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Run a research mission and save it to this project to see results here.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
            Project not found.
          </div>
        )}
      </motion.div>
    </AppLayout>
  )
}
