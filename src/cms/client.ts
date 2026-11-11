import { createPublicReader } from './published'

export const publicSupabase = createPublicReader(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
