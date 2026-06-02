// Phase — Sponsor / Affiliate click tracker + redirect.
//
// Flow per spec:
//   GET /api/sponsor/<slug>
//   1. Resolve sponsor from /lib/sponsors.ts (slug → final affiliate URL)
//   2. If user is authenticated, INSERT a row into sponsor_clicks (rewarded only if first today)
//   3. 302 redirect to the sponsor's affiliate URL
//   4. Anonymous users still get the redirect, but no DB write and no credits.
//
// Idempotency: server enforces ONE rewarded claim per user+sponsor per UTC day. Subsequent
// clicks on the same day still insert (for analytics) but with rewarded=false, credits_given=0.
//
// Safety: query params from the URL are NEVER forwarded to the sponsor URL — the affiliate
// URL is read straight from the trusted config in lib/sponsors.ts.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSponsor } from '@/lib/sponsors'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabase() {
  const env = getSupabasePublicEnv()
  if (!env) return null

  const cookieStore = cookies()
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: (n: string, v: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
    },
  })
}

function utcDayBounds(): { startISO: string; endISO: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

type ClickRecordResult = {
  rewarded: boolean
  alreadyClaimedToday: boolean
  creditsGiven: number
}

async function readEligibility(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  slug: string,
): Promise<{ rewarded: boolean; alreadyClaimedToday: boolean }> {
  const { startISO, endISO } = utcDayBounds()
  const { data: priorRewarded } = await supabase
    .from('sponsor_clicks')
    .select('id')
    .eq('user_id', userId)
    .eq('sponsor', slug)
    .eq('rewarded', true)
    .gte('created_at', startISO)
    .lt('created_at', endISO)
    .limit(1)
    .maybeSingle()

  const alreadyClaimedToday = !!priorRewarded
  return { rewarded: !alreadyClaimedToday, alreadyClaimedToday }
}

async function recordClick(
  userId: string,
  slug: string,
  reward: number,
): Promise<ClickRecordResult> {
  const service = createSupabaseServiceClient()
  if (service) {
    const { data, error } = await service.rpc('record_sponsor_click', {
      p_user_id: userId,
      p_sponsor: slug,
      p_reward: reward,
    })
    if (!error && data && typeof data === 'object') {
      const row = data as Record<string, unknown>
      return {
        rewarded: !!row.rewarded,
        alreadyClaimedToday: !!row.already_claimed_today,
        creditsGiven: Number(row.credits_given || 0),
      }
    }
    if (error) {
      console.warn('[Sponsor Click] rpc failed', error.message)
    }
  }

  const supabase = getSupabase()
  if (!supabase) {
    return { rewarded: false, alreadyClaimedToday: false, creditsGiven: 0 }
  }

  const { rewarded, alreadyClaimedToday } = await readEligibility(supabase, userId, slug)
  const creditsGiven = rewarded ? reward : 0

  const { error: insertError } = await supabase.from('sponsor_clicks').insert({
    user_id: userId,
    sponsor: slug,
    rewarded,
    credits_given: creditsGiven,
  })

  if (insertError) {
    console.warn('[Sponsor Click] insert failed', insertError.message)
  }

  return { rewarded, alreadyClaimedToday, creditsGiven }
}

// GET handler — logs + redirects.
// Optional ?check=1 returns JSON (no redirect) so the UI can pre-flight eligibility.
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const slug = (params?.name || '').toLowerCase().trim()
  const sponsor = getSponsor(slug)
  if (!sponsor) return NextResponse.json({ error: 'Unknown sponsor' }, { status: 404 })

  const checkOnly = req.nextUrl.searchParams.get('check') === '1'
  const supabase = getSupabase()
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } }

  let rewarded = false
  let alreadyClaimedToday = false

  if (user && supabase) {
    if (checkOnly) {
      const eligibility = await readEligibility(supabase, user.id, slug)
      rewarded = eligibility.rewarded
      alreadyClaimedToday = eligibility.alreadyClaimedToday
    } else {
      const result = await recordClick(user.id, slug, sponsor.reward)
      rewarded = result.rewarded
      alreadyClaimedToday = result.alreadyClaimedToday
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

  // Default path — redirect to the affiliate URL. Use 302 so browsers do not cache.
  return NextResponse.redirect(sponsor.url, { status: 302 })
}
