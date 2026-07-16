/** Public Supabase credentials available to browser + Edge middleware. */
export type SupabasePublicEnv = {
  url: string
  anonKey: string
}

/**
 * Resolve Supabase URL + anon/publishable key at request time (never at module scope).
 * Accepts legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the newer publishable key name,
 * and the currently configured Vercel typo `NEXT_PUBLIC_SUPABASE_ANON_`.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_?.trim()

  if (!url || !anonKey) return null
  return { url, anonKey }
}
