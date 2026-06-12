import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/auth/rate-limit'
import { requireProjectOwner } from '@/lib/auth/require-project-owner'

type SecureRouteOptions = {
  /** Rate-limit bucket suffix (default `ai`). */
  rateLimitKey?: string
  max?: number
  windowMs?: number
  projectId?: string | null
}

type SecureRouteResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse }

/** Auth + rate limit + optional project ownership for high-cost routes. */
export async function secureGenerationRoute(
  options: SecureRouteOptions = {}
): Promise<SecureRouteResult> {
  const auth = await requireAuth()
  if (auth.response) return auth

  const bucket = `${options.rateLimitKey ?? 'ai'}:${auth.user.id}`
  if (checkRateLimit(bucket, options.max ?? 40, options.windowMs ?? 60_000)) {
    return {
      user: null,
      response: NextResponse.json(rateLimitResponse(), { status: 429 }),
    }
  }

  if (options.projectId) {
    const ownerErr = await requireProjectOwner(auth.user.id, options.projectId)
    if (ownerErr) return { user: null, response: ownerErr }
  }

  return auth
}
