import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Only publishable credentials belong in Vite. Session tokens are tab-scoped.
export const adminSupabase = url && key?.startsWith('sb_publishable_')
  ? createClient(url, key, {
    auth: {
      storage: window.sessionStorage,
      storageKey: 'portfolio-admin-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
  : null
