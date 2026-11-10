import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
// The public reader never loads, stores, or sends the admin session.
export const publicSupabase =
  url && key?.startsWith('sb_publishable_')
    ? createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'portfolio-public-reader',
        },
      })
    : null
