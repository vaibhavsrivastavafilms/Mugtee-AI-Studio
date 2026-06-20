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
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeCreatorMemoryProfile } from '@/lib/creator/creator-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabase() {
  return tryCreateSupabaseServerClient()
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
    creator_profile: normalizeCreatorMemoryProfile(row?.creator_profile),
  }
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({
      plan_type: 'FREE',
      is_unlimited: false,
      is_trial_active: false,
      trial_days_left: 0,
      signed_in: false,
    })
  }
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
  if (!supabase) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 })
  }
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

// PATCH /api/profile — save Creator Memory Profile (Phase 2.3).
export async function PATCH(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 })
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
  }

  const creatorProfile = normalizeCreatorMemoryProfile(
    raw.creator_profile ?? raw.creatorProfile ?? raw
  )

  const { data: existing } = await supabase
    .from('profiles')
    .select('creator_profile')
    .eq('id', user.id)
    .maybeSingle()

  const merged = normalizeCreatorMemoryProfile({
    ...(existing?.creator_profile && typeof existing.creator_profile === 'object'
      ? existing.creator_profile
      : {}),
    ...creatorProfile,
    updatedAt: new Date().toISOString(),
  })

  const { error } = await supabase.from('profiles').upsert(
    { id: user.id, creator_profile: merged },
    { onConflict: 'id' }
  )

  if (error) {
    console.warn('[profile/patch] upsert failed', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return NextResponse.json({
    ...computeStatus(row || {}),
    creator_profile: normalizeCreatorMemoryProfile(row?.creator_profile),
    saved: true,
  })
}
