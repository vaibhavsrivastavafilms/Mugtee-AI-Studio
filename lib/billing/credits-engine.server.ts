import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  checkLimit,
  incrementUsage,
  type LimitCheckResult,
  type UsageMetric,
  type UsageSnapshot,
  getUsage,
} from '@/lib/usage/usage-tracker'

export type CreditCheckResult = LimitCheckResult & {
  remaining: number
  periodStart: string | null
}

/** Reset usage counters at month boundary (UTC). */
export async function ensureUsagePeriodCurrent(userId: string): Promise<void> {
  const service = createSupabaseServiceClient()
  if (!service) return

  const { data: row } = await service
    .from('profiles')
    .select('usage_period_start, generations_count, exports_count, renders_count, projects_count')
    .eq('id', userId)
    .maybeSingle()

  const periodStart = row?.usage_period_start
    ? new Date(String(row.usage_period_start))
    : null
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  if (!periodStart || periodStart < monthStart) {
    await service
      .from('profiles')
      .update({
        usage_period_start: monthStart.toISOString(),
        generations_count: 0,
        exports_count: 0,
        renders_count: 0,
      })
      .eq('id', userId)
  }
}

export async function checkCredits(
  userId: string,
  metric: UsageMetric = 'generations'
): Promise<CreditCheckResult> {
  await ensureUsagePeriodCurrent(userId)
  const check = await checkLimit(userId, metric)
  const remaining =
    check.unlimited || !check.limits_enabled
      ? Infinity
      : Math.max(0, check.limit - check.used)

  const service = createSupabaseServiceClient()
  const { data: row } = service
    ? await service.from('profiles').select('usage_period_start').eq('id', userId).maybeSingle()
    : { data: null }

  return {
    ...check,
    remaining,
    periodStart: row?.usage_period_start ? String(row.usage_period_start) : null,
  }
}

export async function consumeCredit(
  userId: string,
  metric: UsageMetric = 'generations',
  amount = 1
): Promise<void> {
  await ensureUsagePeriodCurrent(userId)
  await incrementUsage(userId, metric, amount)
}

export async function refundCredit(
  userId: string,
  metric: UsageMetric = 'generations',
  amount = 1
): Promise<void> {
  const service = createSupabaseServiceClient()
  if (!service || amount <= 0) return

  const { data: row } = await service
    .from('profiles')
    .select('generations_count, exports_count, renders_count, projects_count')
    .eq('id', userId)
    .maybeSingle()

  const colMap: Record<UsageMetric, string> = {
    projects: 'projects_count',
    generations: 'generations_count',
    exports: 'exports_count',
    renders: 'renders_count',
  }
  const col = colMap[metric]
  const current = Number((row as Record<string, number> | null)?.[col] ?? 0)
  const next = Math.max(0, current - amount)

  await service.from('profiles').update({ [col]: next }).eq('id', userId)
}

export async function getCreditSnapshot(userId: string): Promise<UsageSnapshot> {
  await ensureUsagePeriodCurrent(userId)
  return getUsage(userId)
}
