import { NextResponse } from 'next/server'

import {
  buildLimitErrorBody,
  checkLimit,
  incrementUsage,
  type UsageMetric,
} from '@/lib/usage/usage-tracker'

export async function guardUsageLimit(
  userId: string,
  metric: UsageMetric
): Promise<NextResponse | null> {
  const check = await checkLimit(userId, metric)
  if (check.allowed) return null
  return NextResponse.json(buildLimitErrorBody(check), { status: 429 })
}

export async function trackUsageMetric(userId: string, metric: UsageMetric): Promise<void> {
  await incrementUsage(userId, metric)
}
