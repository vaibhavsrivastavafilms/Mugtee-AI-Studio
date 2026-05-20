// Phase \u2014 Sponsor / Affiliate click tracker + redirect.
//
// Flow per spec:
//   GET /api/sponsor/<slug>
//   1. Resolve sponsor from /lib/sponsors.ts (slug \u2192 final affiliate URL)
//   2. If user is authenticated, INSERT a row into sponsor_clicks (rewarded only if first today)
//   3. 302 redirect to the sponsor's affiliate URL
//   4. Anonymous users still get the redirect, but no DB write and no credits.
//
// Idempotency: server enforces ONE rewarded claim per user+sponsor per UTC day. Subsequent
// clicks on the same day still insert (for analytics) but with rewarded=false, credits_given=0.
//
// Safety: query params from the URL are NEVER forwarded to the sponsor URL \u2014 the affiliate
// URL is read straight from the trusted config in lib/sponsors.ts.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSponsor } from '@/lib/sponsors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
        remove: (n: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
      },
    },
  )
}

function utcDayBounds(): { startISO: string; endISO: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

// GET handler \u2014 logs + redirects.
// Optional ?check=1 returns JSON (no redirect) so the UI can pre-flight eligibility.
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const slug = (params?.name || '').toLowerCase().trim()
  const sponsor = getSponsor(slug)
  if (!sponsor) return NextResponse.json({ error: 'Unknown sponsor' }, { status: 404 })

  const checkOnly = req.nextUrl.searchParams.get('check') === '1'
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  let rewarded = false
  let alreadyClaimedToday = false

  if (user) {
    const { startISO, endISO } = utcDayBounds()
    // Has this user already had a REWARDED click for this sponsor today?
    const { data: priorRewarded } = await supabase
      .from('sponsor_clicks')
      .select('id')
      .eq('user_id', user.id)
      .eq('sponsor', slug)
      .eq('rewarded', true)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .limit(1)
      .maybeSingle()

    alreadyClaimedToday = !!priorRewarded
    rewarded = !alreadyClaimedToday

    if (!checkOnly) {
      // Idempotent INSERT: always log the click for analytics; only the FIRST today is rewarded.
      try {
        await supabase.from('sponsor_clicks').insert({
          user_id: user.id,
          sponsor: slug,
          rewarded,
          credits_given: rewarded ? sponsor.reward : 0,
        })
      } catch (e) {
        console.warn('[Sponsor Click] insert failed', (e as any)?.message || e)
      }
    }
  }

  if (checkOnly) {
    return NextResponse.json({
      ok: true,
      authenticated: !!user,
      sponsor: { slug: sponsor.slug, name: sponsor.name, reward: sponsor.reward },
      eligible: rewarded,
      already_claimed_today: alreadyClaimedToday,
    })
  }

  // Default path \u2014 redirect to the affiliate URL. Use 302 so browsers do not cache.
  return NextResponse.redirect(sponsor.url, { status: 302 })
}
