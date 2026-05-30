import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getSupabasePublicEnv } from '@/lib/supabase/env'

export type MiddlewareSupabaseContext = {
  supabase: ReturnType<typeof createServerClient> | null
  response: NextResponse
  requestHeaders: Headers
}

/** Edge-safe Supabase client for Next.js middleware (session refresh + cookie bridge). */
export function createMiddlewareSupabaseClient(
  request: NextRequest,
  pathname: string
): MiddlewareSupabaseContext {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const env = getSupabasePublicEnv()
  if (!env) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL and/or anon/publishable key — auth checks skipped'
      )
    }
    return { supabase: null, response, requestHeaders }
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({
          request: { headers: requestHeaders },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        }
      },
    },
  })

  return { supabase, response, requestHeaders }
}

/** Copy auth cache headers + refreshed session cookies onto redirect responses. */
export function mergeSupabaseResponseCookies(
  target: NextResponse,
  source: NextResponse
): void {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  for (const [key, value] of source.headers) {
    const lower = key.toLowerCase()
    if (lower === 'cache-control' || lower === 'expires' || lower === 'pragma') {
      target.headers.set(key, value)
    }
  }
}
