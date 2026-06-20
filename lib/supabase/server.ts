import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

import { getSupabasePublicEnv } from '@/lib/supabase/env'

export type SupabaseServerClient = ReturnType<typeof createServerClient>

/**
 * Request-time Supabase client with cookie bridge.
 * Uses getSupabasePublicEnv() — never reads env at module scope.
 */
export function createSupabaseServerClient(): SupabaseServerClient {
  const env = getSupabasePublicEnv()
  if (!env) {
    throw new Error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon/publishable key'
    )
  }

  const cookieStore = cookies()
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll()
      },
      async setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        _headers: Record<string, string>
      ) {
        try {
          const store = await cookieStore
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          )
        } catch {
          // Server Components cannot write cookies — middleware refreshes them.
        }
      },
    },
  })
}

/** Returns null instead of throwing when Supabase public env is absent. */
export function tryCreateSupabaseServerClient(): SupabaseServerClient | null {
  const env = getSupabasePublicEnv()
  if (!env) return null

  const cookieStore = cookies()
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll()
      },
      async setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        _headers: Record<string, string>
      ) {
        try {
          const store = await cookieStore
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          )
        } catch {
          // Server Components cannot write cookies — middleware refreshes them.
        }
      },
    },
  })
}
