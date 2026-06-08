import {
  areLimitsEnabled,
  getFreePlanLimits,
  isUnlimitedPlan,
  limitForMetric,
  type PlanLimits,
  type UsageMetric,
} from '@/lib/billing/plan-limits'
import { isExportUsageLimitBypassed } from '@/lib/export/export-entitlement'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export type { UsageMetric }

export const PLAN_LIMIT_MESSAGE = "You've reached your current plan limit."

export type UsageCounts = {
  projects: number
  generations: number
  exports: number
  renders: number
}

export type UsageSnapshot = {
  used: UsageCounts
  limits: PlanLimits
  plan_type: string
  unlimited: boolean
  limits_enabled: boolean
}

type ProfileUsageRow = {
  plan_type?: string | null
  trial_ends_at?: string | null
  projects_count?: number | null
  generations_count?: number | null
  exports_count?: number | null
  renders_count?: number | null
  referral_bonus_generations?: number | null
  referral_creator_plan_bonus?: boolean | null
}

function referralContext(row: ProfileUsageRow | null | undefined) {
  return {
    referralBonusGenerations: Number(row?.referral_bonus_generations ?? 0),
    referralCreatorPlanBonus: !!row?.referral_creator_plan_bonus,
  }
}

const METRIC_COLUMN: Record<UsageMetric, keyof ProfileUsageRow> = {
  projects: 'projects_count',
  generations: 'generations_count',
  exports: 'exports_count',
  renders: 'renders_count',
}

function readCount(row: ProfileUsageRow | null | undefined, metric: UsageMetric): number {
  const col = METRIC_COLUMN[metric]
  const raw = row?.[col]
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0
}

function toUsageCounts(row: ProfileUsageRow | null | undefined): UsageCounts {
  return {
    projects: readCount(row, 'projects'),
    generations: readCount(row, 'generations'),
    exports: readCount(row, 'exports'),
    renders: readCount(row, 'renders'),
  }
}

async function fetchProfileRow(userId: string): Promise<ProfileUsageRow | null> {
  const service = createSupabaseServiceClient()
  const client = service
  if (!client) return null

  const { data } = await client
    .from('profiles')
    .select(
      'plan_type, trial_ends_at, projects_count, generations_count, exports_count, renders_count, referral_bonus_generations, referral_creator_plan_bonus'
    )
    .eq('id', userId)
    .maybeSingle()

  return (data as ProfileUsageRow | null) ?? null
}

export async function getUsage(userId: string): Promise<UsageSnapshot> {
  const limitsEnabled = areLimitsEnabled()
  const row = await fetchProfileRow(userId)
  const planType = String(row?.plan_type || 'FREE')
  const unlimited = isUnlimitedPlan(planType, row?.trial_ends_at)
  const used = toUsageCounts(row)
  const ref = referralContext(row)
  const limits: PlanLimits = {
    projects: limitForMetric('projects', planType, row?.trial_ends_at, ref),
    generations: limitForMetric('generations', planType, row?.trial_ends_at, ref),
    exports: limitForMetric('exports', planType, row?.trial_ends_at, ref),
    renders: limitForMetric('renders', planType, row?.trial_ends_at, ref),
  }

  return {
    used,
    limits,
    plan_type: planType,
    unlimited,
    limits_enabled: limitsEnabled,
  }
}

export type LimitCheckResult = {
  allowed: boolean
  used: number
  limit: number
  unlimited: boolean
  limits_enabled: boolean
  metric: UsageMetric
}

export async function checkLimit(
  userId: string,
  metric: UsageMetric
): Promise<LimitCheckResult> {
  const limitsEnabled = areLimitsEnabled()
  const row = await fetchProfileRow(userId)
  const planType = String(row?.plan_type || 'FREE')
  const unlimited = isUnlimitedPlan(planType, row?.trial_ends_at)
  const used = readCount(row, metric)
  const limit = limitForMetric(metric, planType, row?.trial_ends_at, referralContext(row))

  const exportMetricBypass =
    isExportUsageLimitBypassed() && (metric === 'exports' || metric === 'renders')

  if (!limitsEnabled || unlimited || exportMetricBypass) {
    return { allowed: true, used, limit, unlimited, limits_enabled: limitsEnabled, metric }
  }

  return {
    allowed: used < limit,
    used,
    limit,
    unlimited,
    limits_enabled: limitsEnabled,
    metric,
  }
}

export async function incrementUsage(
  userId: string,
  metric: UsageMetric,
  amount = 1
): Promise<void> {
  if (amount <= 0) return

  const service = createSupabaseServiceClient()
  if (!service) {
    console.warn('[usage] increment skipped — no service client')
    return
  }

  const row = await fetchProfileRow(userId)
  const col = METRIC_COLUMN[metric]
  const current = readCount(row, metric)
  const next = current + amount

  const { error } = await service.from('profiles').upsert(
    {
      id: userId,
      [col]: next,
      plan_type: row?.plan_type ?? 'FREE',
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.warn('[usage] increment failed', metric, error.message)
  }
}

export function buildLimitErrorBody(check: LimitCheckResult) {
  return {
    error: PLAN_LIMIT_MESSAGE,
    code: 'plan_limit',
    metric: check.metric,
    used: check.used,
    limit: check.limit,
    upgrade_coming_soon: true,
  }
}
