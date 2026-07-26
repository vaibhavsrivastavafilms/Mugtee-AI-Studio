import { getSupabasePublicEnv } from '@/lib/supabase/env'

/**
 * Detect whether browser authentication can be initialized.
 * Currently powered by Supabase public env; extend here if NextAuth/Clerk/etc. are added.
 */
export function isAuthConfigured(): boolean {
  return getSupabasePublicEnv() !== null
}

export type AuthRuntimeMode = 'production' | 'development'

/** Production = real auth providers available; development = explore without sign-in. */
export function getAuthRuntimeMode(): AuthRuntimeMode {
  return isAuthConfigured() ? 'production' : 'development'
}
