/** Public Supabase credentials available to browser + Edge middleware. */
export type SupabasePublicEnv = {
  url: string
  anonKey: string
}

/**
 * When `NEXT_PUBLIC_SUPABASE_URL` is empty (common after a bad `vercel env pull`)
 * but a JWT anon key is present, recover the project URL from the JWT `ref` claim.
 */
function deriveSupabaseUrlFromAnonJwt(anonKey: string): string | null {
  try {
    const parts = anonKey.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8')
    const data = JSON.parse(json) as { ref?: unknown }
    if (typeof data.ref !== 'string' || !data.ref.trim()) return null
    return `https://${data.ref.trim()}.supabase.co`
  } catch {
    return null
  }
}

/**
 * Resolve Supabase URL + anon/publishable key at request time (never at module scope).
 * Accepts legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the newer publishable key name,
 * and the currently configured Vercel typo `NEXT_PUBLIC_SUPABASE_ANON_`.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_?.trim()

  if (!anonKey) return null

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    deriveSupabaseUrlFromAnonJwt(anonKey) ||
    ''

  if (!url) return null
  return { url, anonKey }
}
