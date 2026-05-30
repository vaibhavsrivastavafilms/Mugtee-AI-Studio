import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanInterest } from '@/lib/billing/plan-catalog'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  RevenueEventTypes,
  type RevenueEventType,
} from '@/lib/analytics/revenue-validation.constants'

export { RevenueEventTypes, type RevenueEventType }

const VALID_PLANS = new Set<PlanInterest>(['free', 'creator', 'pro'])

export type RevenueTrackInput = {
  eventType: RevenueEventType
  userId?: string | null
  sessionId?: string | null
  planInterest?: PlanInterest | string | null
  source?: string | null
  metadata?: Record<string, unknown>
}

export type RevenueValidationMetrics = {
  pricing_visits: number
  upgrade_clicks: number
  payment_attempts: number
  plan_interest_by_plan: { name: string; count: number }[]
  conversion_rate: number | null
  tables_available: { revenue_events: boolean; analytics_fallback: boolean }
}

export function normalizePlanInterest(
  raw: string | null | undefined
): PlanInterest | null {
  const p = String(raw || '')
    .trim()
    .toLowerCase() as PlanInterest
  return VALID_PLANS.has(p) ? p : null
}

/** Insert into revenue_events (service role). Never throws. */
export async function trackRevenueEvent(input: RevenueTrackInput): Promise<void> {
  const service = createSupabaseServiceClient()
  if (!service) return

  const plan = normalizePlanInterest(input.planInterest ?? undefined)
  const source = input.source ? String(input.source).slice(0, 120) : null
  let metadata = input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {}
  try {
    JSON.stringify(metadata)
  } catch {
    metadata = {}
  }

  try {
    await service.from('revenue_events').insert({
      event_type: input.eventType,
      plan_interest: plan,
      user_id: input.userId ?? null,
      session_id: input.sessionId ? String(input.sessionId).slice(0, 80) : null,
      source,
      metadata,
    })
  } catch {
    /* never block UX */
  }
}

/** Upgrade CTA click — records upgrade_clicks + payment_attempts per Phase 8 spec. */
export async function trackUpgradeClick(input: Omit<RevenueTrackInput, 'eventType'>): Promise<void> {
  await trackRevenueEvent({ ...input, eventType: RevenueEventTypes.UPGRADE_CLICKS })
  await trackRevenueEvent({ ...input, eventType: RevenueEventTypes.PAYMENT_ATTEMPTS })
  const plan = normalizePlanInterest(input.planInterest ?? undefined)
  if (plan && plan !== 'free') {
    await trackRevenueEvent({ ...input, eventType: RevenueEventTypes.PLAN_INTEREST })
  }
}

async function tableExists(db: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await db.from(table).select('*', { count: 'exact', head: true }).limit(1)
  if (!error) return true
  const msg = (error.message || '').toLowerCase()
  return !(
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    error.code === '42P01'
  )
}

async function countRevenueEvents(db: SupabaseClient, eventType: RevenueEventType): Promise<number> {
  const { count, error } = await db
    .from('revenue_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', eventType)
  if (error) throw error
  return count ?? 0
}

async function countAnalyticsEvents(db: SupabaseClient, event: string): Promise<number> {
  const { count, error } = await db
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event', event)
  if (error) throw error
  return count ?? 0
}

function bumpPlan(map: Record<string, number>, key: string | null | undefined) {
  const k = (key || '').trim() || 'unknown'
  map[k] = (map[k] || 0) + 1
}

export async function computeRevenueValidationMetrics(
  db: SupabaseClient
): Promise<RevenueValidationMetrics> {
  const revenueAvailable = await tableExists(db, 'revenue_events')
  let pricingVisits = 0
  let upgradeClicks = 0
  let paymentAttempts = 0
  const planInterest: Record<string, number> = {}
  let analyticsFallback = false

  if (revenueAvailable) {
    ;[pricingVisits, upgradeClicks, paymentAttempts] = await Promise.all([
      countRevenueEvents(db, RevenueEventTypes.PRICING_PAGE_VISITS),
      countRevenueEvents(db, RevenueEventTypes.UPGRADE_CLICKS),
      countRevenueEvents(db, RevenueEventTypes.PAYMENT_ATTEMPTS),
    ])

    const { data: planRows } = await db
      .from('revenue_events')
      .select('plan_interest, event_type')
      .in('event_type', [
        RevenueEventTypes.PLAN_INTEREST,
        RevenueEventTypes.PAYMENT_ATTEMPTS,
        RevenueEventTypes.UPGRADE_CLICKS,
      ])
      .not('plan_interest', 'is', null)
      .in('plan_interest', ['creator', 'pro'])
      .limit(10000)

    for (const row of planRows || []) {
      if (row.plan_interest === 'creator' || row.plan_interest === 'pro') {
        bumpPlan(planInterest, row.plan_interest)
      }
    }
  }

  if (!revenueAvailable || (pricingVisits === 0 && upgradeClicks === 0)) {
    const analyticsOk = await tableExists(db, 'analytics_events')
    if (analyticsOk) {
      analyticsFallback = true
      if (pricingVisits === 0) {
        pricingVisits = await countAnalyticsEvents(db, AnalyticsEvents.PRICING_PAGE_VIEW)
      }
      if (upgradeClicks === 0) {
        upgradeClicks = await countAnalyticsEvents(db, AnalyticsEvents.UPGRADE_CLICK)
      }
      if (paymentAttempts === 0) {
        const waitlist = await countAnalyticsEvents(
          db,
          AnalyticsEvents.UPGRADE_WAITLIST_JOINED
        )
        paymentAttempts = upgradeClicks + waitlist
      }
    }
  }

  const conversionRate =
    pricingVisits > 0
      ? Math.round((upgradeClicks / pricingVisits) * 1000) / 1000
      : null

  const planInterestByPlan = Object.entries(planInterest)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    pricing_visits: pricingVisits,
    upgrade_clicks: upgradeClicks,
    payment_attempts: paymentAttempts,
    plan_interest_by_plan: planInterestByPlan,
    conversion_rate: conversionRate,
    tables_available: {
      revenue_events: revenueAvailable,
      analytics_fallback: analyticsFallback,
    },
  }
}
