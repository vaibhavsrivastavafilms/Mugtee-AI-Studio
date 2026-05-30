import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import {
  APP_ROUTE_LOGIN_FALLBACK,
  isProtectedPath,
  isPublicPath,
  loginRedirectUrl,
} from '@/lib/auth/public-routes'
import {
  MUGTEE_MODE_COOKIE,
  POST_LOGIN_REDIRECT_COOKIE,
  resolvePostLoginRedirect,
} from '@/lib/auth/post-login-redirect'
import { buildOAuthCallbackUrl, hasOAuthCode } from '@/lib/auth/oauth-code'
import {
  cloneWithPathname,
  legacyStudioPathname,
} from '@/lib/shell/legacy-studio-redirect'

/** Supabase PKCE code must be exchanged at /auth/callback — never on app routes. */
function oauthCodeRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl
  if (pathname === '/auth/callback') return null
  if (!hasOAuthCode(searchParams)) return null

  const target = buildOAuthCallbackUrl(
    request.nextUrl.origin,
    pathname,
    new URLSearchParams(searchParams.toString())
  )
  return NextResponse.redirect(target)
}

function legacyStudioPathRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl
  const targetPath = legacyStudioPathname(pathname)
  if (!targetPath) return null

  const url = cloneWithPathname(request, targetPath)

  if (pathname === '/studio/quick-cut' || pathname.startsWith('/studio/quick-cut/')) {
    url.searchParams.set('mode', 'quick')
  } else if (pathname === '/create' || pathname === '/dashboard') {
    if (!searchParams.has('mode')) url.searchParams.set('mode', 'quick')
  }

  for (const [key, value] of searchParams.entries()) {
    if (key === 'mode' && url.searchParams.has('mode')) continue
    url.searchParams.set(key, value)
  }

  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  const legacyRedirect = legacyStudioPathRedirect(request)
  if (legacyRedirect) return legacyRedirect

  const oauthRedirect = oauthCodeRedirect(request)
  if (oauthRedirect) return oauthRedirect

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
  if (user && (pathname === '/login' || pathname === '/signin' || pathname === '/auth/login')) {
    const next = resolvePostLoginRedirect({
      nextParam: request.nextUrl.searchParams.get('next'),
      redirectCookie: request.cookies.get(POST_LOGIN_REDIRECT_COOKIE)?.value,
      modeCookie: request.cookies.get(MUGTEE_MODE_COOKIE)?.value,
      fallback: APP_ROUTE_LOGIN_FALLBACK,
    })
    const redirectResponse = NextResponse.redirect(new URL(next, request.url))
    redirectResponse.cookies.set(POST_LOGIN_REDIRECT_COOKIE, '', { path: '/', maxAge: 0 })
    redirectResponse.cookies.set(MUGTEE_MODE_COOKIE, '', { path: '/', maxAge: 0 })
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
