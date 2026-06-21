import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
