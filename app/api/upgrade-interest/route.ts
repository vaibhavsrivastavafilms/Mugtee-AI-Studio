import { NextRequest, NextResponse } from 'next/server'
import type { PlanInterest } from '@/lib/billing/plan-catalog'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackServerEvent } from '@/lib/analytics/track-server-event'
import { RevenueEventTypes, trackRevenueEvent, trackUpgradeClick } from '@/lib/analytics/revenue-validation'
import { normalizeRevenueEventType } from '@/lib/analytics/revenue-validation.constants'

export const dynamic = 'force-dynamic'

const VALID_PLANS = new Set<PlanInterest>(['free', 'creator', 'pro'])

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service = createSupabaseServiceClient()
  if (!service) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

  const { data, error } = await service
    .from('upgrade_waitlist')
    .select('name, email, plan_interest, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const name = String(body.name || '').trim().slice(0, 120)
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
  const planInterest = String(body.plan_interest ?? body.planInterest ?? '')
    .trim()
    .toLowerCase() as PlanInterest
  const eventType = String(body.event_type ?? body.eventType ?? '').trim()

  const revenueType = normalizeRevenueEventType(eventType)
  if (revenueType) {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const analyticsEvent =
      revenueType === RevenueEventTypes.PRICING_PAGE_VISITS
        ? AnalyticsEvents.PRICING_PAGE_VIEW
        : AnalyticsEvents.UPGRADE_CLICK
    await trackServerEvent({
      event: analyticsEvent,
      userId: user?.id ?? null,
      page: '/pricing',
      metadata: {
        plan_interest: VALID_PLANS.has(planInterest) ? planInterest : undefined,
        source: String(body.source || 'pricing').slice(0, 80),
      },
    })
    const base = {
      userId: user?.id ?? null,
      planInterest: VALID_PLANS.has(planInterest) ? planInterest : null,
      source: String(body.source || 'pricing').slice(0, 80),
    }
    if (revenueType === RevenueEventTypes.UPGRADE_CLICKS) {
      await trackUpgradeClick(base)
    } else {
      await trackRevenueEvent({ ...base, eventType: revenueType })
    }
    return NextResponse.json({ ok: true, tracked: revenueType })
  }

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!VALID_PLANS.has(planInterest)) {
    return NextResponse.json({ error: 'Invalid plan interest' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createSupabaseServiceClient()
  if (!service) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

  const row = {
    user_id: user?.id ?? null,
    name,
    email,
    plan_interest: planInterest,
  }

  const { data, error } = await service
    .from('upgrade_waitlist')
    .upsert(row, { onConflict: 'email,plan_interest' })
    .select('name, email, plan_interest, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await trackServerEvent({
    event: AnalyticsEvents.UPGRADE_WAITLIST_JOINED,
    userId: user?.id ?? null,
    page: '/pricing',
    metadata: { plan_interest: planInterest, source: String(body.source || 'waitlist_form') },
  })

  await trackRevenueEvent({
    eventType: RevenueEventTypes.PAYMENT_ATTEMPTS,
    userId: user?.id ?? null,
    planInterest,
    source: String(body.source || 'waitlist_form'),
  })
  await trackRevenueEvent({
    eventType: RevenueEventTypes.PLAN_INTEREST,
    userId: user?.id ?? null,
    planInterest,
    source: String(body.source || 'waitlist_form'),
  })

  return NextResponse.json({ ok: true, entry: data })
}
