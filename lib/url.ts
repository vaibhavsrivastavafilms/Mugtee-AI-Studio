import { NextRequest } from 'next/server'

/** Production apex origin — canonical for SEO metadata and fallbacks. */
export const CANONICAL_SITE_ORIGIN = 'https://mugtee.in'

const LOOPBACK_HOSTS = new Set(['0.0.0.0', '127.0.0.1', '[::1]'])

function normalizeApplicationOrigin(raw?: string | null): string | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(raw.trim())
    if (LOOPBACK_HOSTS.has(url.hostname)) {
      url.hostname = 'localhost'
    }
    return url.origin.replace(/\/$/, '')
  } catch {
    return null
  }
}

/**
 * Canonical browser-facing application origin for OAuth callbacks and redirects.
 * Never derives from req.url, Host header, or container bind addresses (0.0.0.0).
 */
export function resolveApplicationOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXTAUTH_URL,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeApplicationOrigin(candidate)
    if (normalized) return normalized
  }

  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL?.trim()) {
    const vercelOrigin = normalizeApplicationOrigin(`https://${process.env.VERCEL_URL.trim()}`)
    if (vercelOrigin) return vercelOrigin
  }

  return 'http://localhost:3000'
}

export function buildApplicationRedirectUrl(
  path: string,
  params?: Record<string, string | undefined>
): string {
  const target = new URL(safeRelative(path, '/'), `${resolveApplicationOrigin()}/`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') target.searchParams.set(key, value)
    }
  }
  return target.toString()
}

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
 * Prefer {@link resolveApplicationOrigin} for OAuth and auth redirects.
 */
export function getBaseUrl(request?: NextRequest): string {
  const fromEnv = normalizeApplicationOrigin(process.env.NEXT_PUBLIC_BASE_URL)
  if (fromEnv) return fromEnv
  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host && !LOOPBACK_HOSTS.has(host.split(':')[0] ?? host)) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }
  return resolveApplicationOrigin()
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
