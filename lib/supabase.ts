import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let anonClient: SupabaseClient | null | undefined

/**
 * Lazy anon Supabase client. Prefer `createSupabaseServerClient()` in API routes
 * so auth cookies are respected. Never call at module scope — env vars may be
 * absent during Next.js build ("Collecting page data").
 */
export function createSupabaseAnonClient(): SupabaseClient | null {
  if (anonClient !== undefined) return anonClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    anonClient = null
    return null
  }

  anonClient = createClient(url, key)
  return anonClient
}
