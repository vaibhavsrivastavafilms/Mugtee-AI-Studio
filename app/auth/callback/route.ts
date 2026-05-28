import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import { safeRelative } from '@/lib/url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeRelative(url.searchParams.get('next'), APP_ROUTE_LOGIN_FALLBACK)

  // CRITICAL AUTH FIX (Master Execution): Use the request's ACTUAL origin for the
  // post-OAuth redirect, NOT NEXT_PUBLIC_BASE_URL. If they diverge (preview proxy
  // domains, custom domains, etc.) the cookies we set during exchangeCodeForSession
  // are scoped to this origin and the redirect would cross-domain — dropping the
  // session and forcing a second login. Always stay on the same host.
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'https'
  const host  = request.headers.get('x-forwarded-host')  || request.headers.get('host') || request.nextUrl.host
  const base  = `${proto}://${host}`.replace(/\/$/, '')

  if (!code) {
    return NextResponse.redirect(
      `${base}/login?error=missing_code&next=${encodeURIComponent(next)}`
    )
  }

  const response = NextResponse.redirect(`${base}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchange error:', error.message)
    return NextResponse.redirect(
      `${base}/login?error=oauth_failed&msg=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
    )
  }

  // Phase V1.1 — Grant 7-day PRO_TRIAL on first login. Idempotent via trial_claimed flag.
  // Inlined here (vs separate API call) so we share the same supabase client/cookie context.
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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

  return response
}
