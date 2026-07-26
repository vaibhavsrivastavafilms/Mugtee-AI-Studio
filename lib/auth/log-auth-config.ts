import { getSupabasePublicEnv } from '@/lib/supabase/env'

function hasEnvValue(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

/**
 * Dev-only diagnostics for auth configuration (never logs full secrets).
 */
export function logAuthConfigDiagnostics(scope = 'auth-config'): void {
  if (process.env.NODE_ENV !== 'development') return

  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_?.trim()

  const resolved = getSupabasePublicEnv()
  const urlDetected = hasEnvValue(urlRaw) || Boolean(resolved?.url)
  const anonDetected = Boolean(anonKey)
  const authConfigured = resolved !== null

  console.info(`[${scope}]`, {
    supabaseUrlDetected: urlDetected,
    supabaseUrlHost: resolved?.url
      ? (() => {
          try {
            return new URL(resolved.url).host
          } catch {
            return '(invalid-url)'
          }
        })()
      : null,
    anonKeyDetected: anonDetected,
    anonKeySource: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
        ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_?.trim()
          ? 'NEXT_PUBLIC_SUPABASE_ANON_'
          : null,
    authConfigured,
    developmentMode: !authConfigured,
  })
}
