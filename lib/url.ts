import { NextRequest } from 'next/server'

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
  return 'http://localhost:3000'
}
