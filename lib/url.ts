import { NextRequest } from 'next/server'

/** Production apex origin — canonical for SEO metadata and fallbacks. */
export const CANONICAL_SITE_ORIGIN = 'https://mugtee.in'

/**
 * Canonical site origin for metadata, sitemap, and robots.
 * Always prefers NEXT_PUBLIC_BASE_URL; falls back to the production apex.
 */
export function getCanonicalSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL
  return (fromEnv || CANONICAL_SITE_ORIGIN).replace(/\/$/, '')
}

/**
 * Returns the canonical absolute origin for this deployment.
 * Priority: NEXT_PUBLIC_BASE_URL > request origin > forwarded host header > localhost fallback.
 * Strips any trailing slash. Behind a Kubernetes proxy `request.url` may point at
 * 0.0.0.0:3000 — never trust it for outbound redirects.
 */
export function getBaseUrl(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host) return `${proto}://${host}`.replace(/\/$/, '')
  }
  return CANONICAL_SITE_ORIGIN
}

/**
 * Returns a safe relative path for `Location` headers / NextResponse.redirect targets.
 * Strips schemes, protocol-relative URLs, and falsy values — prevents open-redirect
 * vulnerabilities via crafted `?next=` or OAuth `state.redirectTo` params.
 */
export function safeRelative(input: unknown, fallback = '/'): string {
  if (typeof input !== 'string' || !input.length) return fallback
  if (/^[a-z][a-z0-9+.\-]*:/i.test(input)) return fallback   // 'http://', 'javascript:', 'data:'
  if (input.startsWith('//')) return fallback                 // protocol-relative -> external
  const normalized = input.startsWith('/') ? input : '/' + input
  return normalized.replace(/^\/+/, '/')                       // collapse '//' / '///'
}
