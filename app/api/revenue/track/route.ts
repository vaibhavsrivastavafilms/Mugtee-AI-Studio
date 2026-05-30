import { NextRequest, NextResponse } from 'next/server'
import {
  normalizePlanInterest,
  RevenueEventTypes,
  trackRevenueEvent,
  trackUpgradeClick,
} from '@/lib/analytics/revenue-validation'
import { normalizeRevenueEventType } from '@/lib/analytics/revenue-validation.constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const rawType = String(body.event_type ?? body.eventType ?? '').trim()
  const eventType = normalizeRevenueEventType(rawType)
  if (!eventType) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const planInterest = normalizePlanInterest(
    String(body.plan_interest ?? body.planInterest ?? body.plan ?? '')
  )
  const source = body.source ? String(body.source).slice(0, 120) : null
  const sessionId = body.session_id ? String(body.session_id).slice(0, 80) : null
  const metadata =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {}

  const base = {
    userId: user?.id ?? null,
    sessionId,
    planInterest,
    source,
    metadata,
  }

  if (eventType === RevenueEventTypes.UPGRADE_CLICKS) {
    await trackUpgradeClick(base)
  } else {
    await trackRevenueEvent({ ...base, eventType })
  }

  return NextResponse.json({ ok: true, tracked: eventType })
}
