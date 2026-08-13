import 'server-only'

import type { User } from '@supabase/supabase-js'
import type { AuthError } from '@supabase/supabase-js'

import type { SupabaseServerClient } from '@/lib/supabase/server'

function isAuthNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) return false
  const message = String((error as { message: unknown }).message).toLowerCase()
  return (
    message.includes('fetch failed') ||
    message.includes('connect timeout') ||
    message.includes('network') ||
    message.includes('timed out')
  )
}

/**
 * Authoritative server identity for security-sensitive routes.
 * Always validates the JWT with Supabase Auth — never trusts session.user from getSession().
 */
export async function getAuthenticatedUser(
  supabase: SupabaseServerClient
): Promise<{ user: User | null; error: AuthError | null }> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (user) {
    return { user, error: null }
  }

  if (error && isAuthNetworkFailure(error)) {
    return { user: null, error }
  }

  // Missing or invalid session — unauthenticated (401), not a server error.
  return { user: null, error: null }
}

export { isAuthNetworkFailure }
