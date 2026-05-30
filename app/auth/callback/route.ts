import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackServerEvent } from '@/lib/analytics/track-server-event'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import {
  MUGTEE_MODE_COOKIE,
  POST_LOGIN_REDIRECT_COOKIE,
  resolvePostLoginRedirect,
} from '@/lib/auth/post-login-redirect'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { claimReferral } from '@/lib/referral/referral-service'

export const dynamic = 'force-dynamic'

function clearPostLoginCookies(response: NextResponse): void {
  response.cookies.set(POST_LOGIN_REDIRECT_COOKIE, '', { path: '/', maxAge: 0 })
  response.cookies.set(MUGTEE_MODE_COOKIE, '', { path: '/', maxAge: 0 })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = resolvePostLoginRedirect({
    nextParam: url.searchParams.get('next'),
    redirectCookie: request.cookies.get(POST_LOGIN_REDIRECT_COOKIE)?.value,
    modeCookie: request.cookies.get(MUGTEE_MODE_COOKIE)?.value,
    fallback: APP_ROUTE_LOGIN_FALLBACK,
  })

  // CRITICAL AUTH FIX (Master Execution): Use the request's ACTUAL origin for the
  // post-OAuth redirect, NOT NEXT_PUBLIC_BASE_URL. If they diverge (preview proxy
  // domains, custom domains, etc.) the cookies we set during exchangeCodeForSession
  // are scoped to this origin and the redirect would cross-domain — dropping the
  // session and forcing a second login. Always stay on the same host.
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'https'
  const host  = request.headers.get('x-forwarded-host')  || request.headers.get('host') || request.nextUrl.host
  const base  = `${proto}://${host}`.replace(/\/$/, '')

  if (!code) {
    console.warn('[bootstrap] auth/callback missing code')
    const loginUrl = new URL('/auth/login', base)
    loginUrl.searchParams.set('error', 'missing_code')
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  console.log('[bootstrap] auth/callback exchanging code', { next })

  const env = getSupabasePublicEnv()
  if (!env) {
    console.error('[bootstrap] auth/callback missing Supabase env')
    const loginUrl = new URL('/auth/login', base)
    loginUrl.searchParams.set('error', 'auth_not_configured')
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.redirect(`${base}${next}`)

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[bootstrap] auth/callback exchange error:', error.message)
    const loginUrl = new URL('/auth/login', base)
    loginUrl.searchParams.set('error', 'oauth_failed')
    loginUrl.searchParams.set('msg', error.message)
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  console.log('[bootstrap] auth/callback session exchange ok')

  // Phase V1.1 — Grant 7-day PRO_TRIAL on first login. Idempotent via trial_claimed flag.
  // Inlined here (vs separate API call) so we share the same supabase client/cookie context.
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await trackServerEvent({
        event: AnalyticsEvents.SIGNUP_COMPLETED,
        userId: user.id,
        page: '/auth/callback',
        metadata: { provider: 'google', source: 'auth_callback' },
      })

      const { data: existing } = await supabase.from('profiles').select('trial_claimed').eq('id', user.id).maybeSingle()
      if (!existing?.trial_claimed) {
        const now    = new Date()
        const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        await supabase.from('profiles').upsert({
          id: user.id,
          plan_type: 'PRO_TRIAL',
          trial_started_at: now.toISOString(),
          trial_ends_at:    endsAt.toISOString(),
          trial_claimed:    true,
        }, { onConflict: 'id' })
      }
    }
  } catch (e) {
    console.warn('[auth/callback] trial-grant skipped:', (e as any)?.message || e)
  }

  // Phase 3.5 — Attribute referral from invite cookie (best-effort).
  try {
    const { data: { user: sessionUser } } = await supabase.auth.getUser()
    const referralCode = request.cookies.get('mugtee_referral_code')?.value?.trim()
    const service = createSupabaseServiceClient()
    if (sessionUser && referralCode && service) {
      await claimReferral(service, sessionUser.id, referralCode)
    }
  } catch (e) {
    console.warn('[auth/callback] referral-claim skipped:', (e as any)?.message || e)
  }

  clearPostLoginCookies(response)
  console.log('[bootstrap] auth/callback redirecting to', next)
  return response
}

