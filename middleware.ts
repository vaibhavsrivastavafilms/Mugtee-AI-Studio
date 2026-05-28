import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import {
  APP_ROUTE_LOGIN_FALLBACK,
  isProtectedPath,
  isPublicPath,
  loginRedirectUrl,
} from '@/lib/auth/public-routes'
import { safeRelative } from '@/lib/url'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Signed-in users should not see the login form again after OAuth.
  if (user && (pathname === '/login' || pathname === '/signin')) {
    const next = safeRelative(request.nextUrl.searchParams.get('next'), APP_ROUTE_LOGIN_FALLBACK)
    const redirectResponse = NextResponse.redirect(new URL(next, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    for (const [key, value] of supabaseResponse.headers) {
      const lower = key.toLowerCase()
      if (lower === 'cache-control' || lower === 'expires' || lower === 'pragma') {
        redirectResponse.headers.set(key, value)
      }
    }
    return redirectResponse
  }

  if (isPublicPath(pathname)) {
    return supabaseResponse
  }

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL(loginRedirectUrl(pathname), request.url)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|\\.well-known|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|webmanifest|map)$).*)',
  ],
}
