'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabasePublicEnv } from '@/lib/supabase/env'

let browserClient: SupabaseClient | undefined
let warnedMissingEnv = false

function warnMissingEnvOnce(): void {
  if (warnedMissingEnv) return
  warnedMissingEnv = true
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon/publishable key — auth disabled'
    )
  }
}

/** True when public Supabase env vars are present (safe at call time, not module scope). */
export function isSupabaseBrowserConfigured(): boolean {
  return getSupabasePublicEnv() !== null
}

/**
 * Singleton browser client — one auth listener surface for the app.
 * Returns null when env is missing (never throws at import or init).
 */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient

  const env = getSupabasePublicEnv()
  if (!env) {
    warnMissingEnvOnce()
    return null
  }

  browserClient = createBrowserClient(env.url, env.anonKey)
  return browserClient
}
