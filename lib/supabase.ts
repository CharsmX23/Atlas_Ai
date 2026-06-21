import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Atlas AI] NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
    'Copy .env.example to .env.local and fill in your Supabase credentials. ' +
    'Database-backed pages (Agents, etc.) will not load until this is configured.'
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
)

export type AgentRegistry = {
  id: string
  name: string
  source: string
  description: string
  status: string
  reliability: number
  jobs: number
  latency_ms: number
  domain: string
  icon: string
  icon_color: string
  created_at: string
  updated_at: string
}
