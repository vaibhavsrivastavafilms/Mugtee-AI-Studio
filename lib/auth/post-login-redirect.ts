import type { CreatorMode } from '@/lib/create/routes'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import { safeRelative } from '@/lib/url'

/** Client localStorage keys (mode-aware entry flow). */
export const MUGTEE_MODE_STORAGE_KEY = 'mugtee_mode'
export const POST_LOGIN_REDIRECT_KEY = 'post_login_redirect'

/** Short-lived cookies so OAuth callback can resolve destination server-side. */
export const POST_LOGIN_REDIRECT_COOKIE = 'mugtee_post_login_redirect'
export const MUGTEE_MODE_COOKIE = 'mugtee_mode'

export const POST_LOGIN_COOKIE_MAX_AGE = 600

export type MugteeModeSlug = 'quick-cut' | 'director'

export function mugteeModeFromCreatorMode(mode: CreatorMode): MugteeModeSlug {
  return mode === 'director' ? 'director' : 'quick-cut'
}

export function creatorModeFromMugteeMode(
  value: string | null | undefined
): CreatorMode | null {
  if (value === 'director') return 'director'
  if (value === 'quick-cut' || value === 'quick') return 'quick'
  return null
}

export function destinationForMugteeMode(
  mode: string | null | undefined
): string {
  if (mode === 'director') return '/workspace'
  return '/create?mode=quick'
}

export function resolvePostLoginRedirect(input: {
  nextParam?: string | null
  redirectCookie?: string | null
  modeCookie?: string | null
  fallback?: string
}): string {
  const fallback = input.fallback ?? APP_ROUTE_LOGIN_FALLBACK
  const fromQuery = input.nextParam?.trim()
  if (fromQuery) return safeRelative(fromQuery, fallback)

  const fromCookie = input.redirectCookie?.trim()
  if (fromCookie) return safeRelative(fromCookie, fallback)

  const fromMode = destinationForMugteeMode(input.modeCookie)
  return safeRelative(fromMode, fallback)
}
