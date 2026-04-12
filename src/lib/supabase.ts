import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Public client — safe to use in browser (respects RLS)
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
)

// Admin client — server-side only, bypasses RLS
// NEVER import this in client components
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey
)
