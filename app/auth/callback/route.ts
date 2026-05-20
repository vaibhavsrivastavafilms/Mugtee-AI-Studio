import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getBaseUrl, safeRelative } from '@/lib/url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeRelative(url.searchParams.get('next'), '/dashboard')
  const base = getBaseUrl(request)

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=missing_code`)
  }

  // Build the response FIRST so we can attach Supabase session cookies to it.
  const response = NextResponse.redirect(`${base}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchange error:', error.message)
    return NextResponse.redirect(`${base}/login?error=oauth_failed&msg=${encodeURIComponent(error.message)}`)
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
