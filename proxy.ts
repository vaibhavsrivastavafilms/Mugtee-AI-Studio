import { NextResponse, type NextRequest } from 'next/server'

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
import {
  createMiddlewareSupabaseClient,
  mergeSupabaseResponseCookies,
} from '@/lib/supabase/middleware'

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

function passThroughWithPathname(request: NextRequest, pathname: string): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export async function proxy(request: NextRequest) {
  const legacyRedirect = legacyStudioPathRedirect(request)
  if (legacyRedirect) return legacyRedirect

  const oauthRedirect = oauthCodeRedirect(request)
  if (oauthRedirect) return oauthRedirect

  const pathname = request.nextUrl.pathname

  try {
    const { supabase, response: supabaseResponse } = createMiddlewareSupabaseClient(
      request,
      pathname
    )

    let user: { id: string } | null = null
    if (supabase) {
      const { data, error } = await supabase.auth.getUser()
      if (error && process.env.NODE_ENV !== 'production') {
        console.warn('[proxy] supabase.auth.getUser:', error.message)
      }
      user = data.user
    }

    // Signed-in users should not see the login form again after OAuth.
    if (pathname === '/signin') {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.search = request.nextUrl.search
      return NextResponse.redirect(loginUrl)
    }

    if (user && (pathname === '/login' || pathname === '/auth/login')) {
      const next = resolvePostLoginRedirect({
        nextParam: request.nextUrl.searchParams.get('next'),
        redirectCookie: request.cookies.get(POST_LOGIN_REDIRECT_COOKIE)?.value,
        modeCookie: request.cookies.get(MUGTEE_MODE_COOKIE)?.value,
        fallback: APP_ROUTE_LOGIN_FALLBACK,
      })
      const redirectResponse = NextResponse.redirect(new URL(next, request.url))
      redirectResponse.cookies.set(POST_LOGIN_REDIRECT_COOKIE, '', { path: '/', maxAge: 0 })
      redirectResponse.cookies.set(MUGTEE_MODE_COOKIE, '', { path: '/', maxAge: 0 })
      mergeSupabaseResponseCookies(redirectResponse, supabaseResponse)
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[proxy] invocation failed:', message)

    if (isPublicPath(pathname)) {
      return passThroughWithPathname(request, pathname)
    }

    if (isProtectedPath(pathname)) {
      const loginUrl = new URL(loginRedirectUrl(pathname), request.url)
      return NextResponse.redirect(loginUrl)
    }

    return passThroughWithPathname(request, pathname)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|feedback\\.html|manifest\\.json|sw\\.js|\\.well-known|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|json|js|txt|xml|webmanifest|map)$).*)',
  ],
}
