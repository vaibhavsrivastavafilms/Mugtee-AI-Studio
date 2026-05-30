/**
 * Route classification for middleware auth — keeps Quick Cut public and avoids
 * duplicate login redirects on paths that already have layout guards.
 */

const PUBLIC_EXACT = new Set([
  '/',
  '/auth',
  '/login',
  '/auth/login',
  '/signin',
  '/pricing',
  '/offline',
])

const PUBLIC_PREFIXES = [
  '/auth/',
  '/invite/',
  '/quick-cut',
  '/blog',
  '/about',
  '/privacy',
  '/terms',
  '/api/',
]

/** App routes that require a session (middleware redirect). */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/create',
  '/studio',
  '/workspace',
  '/pipeline',
  '/calendar',
  '/media',
  '/crew',
  '/shoots',
  '/analytics',
  '/settings',
  '/automations',
  '/script/',
  '/projects',
  '/project/',
  '/cinematic',
  '/library',
  '/scripts',
  '/storyboards',
  '/onboarding',
]

export function isPublicPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/'
  if (PUBLIC_EXACT.has(path)) return true
  if (path.startsWith('/cinematic/examples')) return true
  for (const prefix of PUBLIC_PREFIXES) {
    if (path === prefix || path.startsWith(prefix)) return true
  }
  return false
}

export function isProtectedPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/'
  if (isPublicPath(path)) return false
  if (path.startsWith('/cinematic/examples')) return false
  for (const prefix of PROTECTED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix)) return true
  }
  return false
}

/**
 * Login `next` fallback for `(app)/layout` when `x-pathname` is absent.
 * Middleware normally sets that header on every matched request; this covers
 * edge cases only. Use a protected app route — not `/` (Quick Cut home) or
 * OAuth/login defaults — so unauthenticated `(app)` access never steals the
 * Quick Cut `/?resume=1` return path.
 */
export const APP_ROUTE_LOGIN_FALLBACK = '/studio/create?mode=quick'

export function loginRedirectUrl(requestPath: string): string {
  const next =
    requestPath && requestPath !== '/login' && requestPath !== '/auth/login'
      ? requestPath
      : APP_ROUTE_LOGIN_FALLBACK
  return `/auth/login?next=${encodeURIComponent(next)}`
}
