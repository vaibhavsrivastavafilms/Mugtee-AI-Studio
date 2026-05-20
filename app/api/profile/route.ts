// Phase V1.1 — Profile + trial API.
//
// GET /api/profile → read the current user's profile (plan_type, trial dates, days remaining).
//                    Auto-downgrades PRO_TRIAL → FREE when trial_ends_at has passed.
//                    Used by lib/usage.tsx to compute `isUnlimited`.
//
// POST /api/profile/claim-trial → idempotently grants the 7-day trial on first call.
//                                   Called from app/auth/callback after first successful login.
//                                   Safe to call repeatedly — the `trial_claimed` flag guards.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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

function computeStatus(row: any) {
  const planType = String(row?.plan_type || 'FREE')
  const endsAt   = row?.trial_ends_at ? new Date(row.trial_ends_at) : null
  const now      = new Date()
  const isTrial  = planType === 'PRO_TRIAL' && endsAt && endsAt > now
  const daysLeft = endsAt && isTrial ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0
  const expired  = planType === 'PRO_TRIAL' && endsAt && endsAt <= now
  return {
    plan_type: planType,
    trial_started_at: row?.trial_started_at ?? null,
    trial_ends_at:    row?.trial_ends_at ?? null,
    trial_claimed:    !!row?.trial_claimed,
    is_trial_active:  Boolean(isTrial),
    is_unlimited:     Boolean(isTrial) || planType === 'PRO',
    trial_days_left:  daysLeft,
    trial_expired:    Boolean(expired),
  }
}

export async function GET() {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ plan_type: 'FREE', is_unlimited: false, is_trial_active: false, trial_days_left: 0, signed_in: false })
  }

  // Try to read profile
  const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  // Lazy auto-downgrade: trial passed expiry → flip plan_type to FREE in-place.
  if (row?.plan_type === 'PRO_TRIAL' && row?.trial_ends_at && new Date(row.trial_ends_at) <= new Date()) {
    try {
      await supabase.from('profiles').update({ plan_type: 'FREE' }).eq('id', user.id)
      row.plan_type = 'FREE'
    } catch (e) {
      console.warn('[profile] auto-downgrade failed', (e as any)?.message || e)
    }
  }

  return NextResponse.json({ ...computeStatus(row || {}), signed_in: true })
}

// POST /api/profile/claim-trial — server-side helper called by auth callback.
export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Idempotent: only grants the trial if no row exists OR trial_claimed is false.
  const { data: existing } = await supabase.from('profiles').select('id, trial_claimed').eq('id', user.id).maybeSingle()
  if (existing?.trial_claimed) {
    const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    return NextResponse.json({ ...computeStatus(row || {}), already_claimed: true })
  }

  const now    = new Date()
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    plan_type: 'PRO_TRIAL',
    trial_started_at: now.toISOString(),
    trial_ends_at:    endsAt.toISOString(),
    trial_claimed:    true,
  }, { onConflict: 'id' })

  if (error) {
    console.warn('[profile/claim-trial] upsert failed', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return NextResponse.json({ ...computeStatus(row || {}), claimed: true })
}
