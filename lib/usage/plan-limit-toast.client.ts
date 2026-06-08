'use client'

import { toast } from 'sonner'
import { CREATOR_UPGRADE_BENEFITS } from '@/lib/billing/plan-catalog'
import { requestExitFeedback } from '@/lib/creator/exit-feedback'
import { track } from '@/lib/posthog'
import {
  RevenueEventTypes,
  trackRevenueValidation,
} from '@/lib/analytics/revenue-validation.client'
import { isExportUsageLimitBypassed } from '@/lib/export/export-entitlement'
import { PLAN_LIMIT_MESSAGE } from '@/lib/usage/usage-tracker'

export type PlanLimitPayload = {
  error?: string
  code?: string
  metric?: string
  used?: number
  limit?: number
  upgrade_coming_soon?: boolean
}

export function isPlanLimitPayload(data: unknown): data is PlanLimitPayload {
  if (!data || typeof data !== 'object') return false
  return (data as PlanLimitPayload).code === 'plan_limit'
}

function upgradeBenefitsDescription(): string {
  return CREATOR_UPGRADE_BENEFITS.map((b) => `• ${b}`).join('\n')
}

function trackLimitUpgrade(source: string) {
  track('upgrade_click', { source, plan: 'creator' })
  trackRevenueValidation({
    eventType: RevenueEventTypes.UPGRADE_CLICKS,
    planInterest: 'creator',
    source,
  })
}

export function showPlanLimitToast(message = PLAN_LIMIT_MESSAGE) {
  trackLimitUpgrade('plan_limit_toast')
  requestExitFeedback('usage_limit')
  toast.error(message, {
    description: `Upgrade to Creator Plan:\n${upgradeBenefitsDescription()}`,
    duration: 10000,
    action: {
      label: 'Join Waitlist',
      onClick: () => {
        trackLimitUpgrade('plan_limit_toast_cta')
        window.location.href = '/pricing#creator'
      },
    },
  })
}

export function handlePlanLimitResponse(res: Response, data: unknown): boolean {
  if (res.status !== 429 && !isPlanLimitPayload(data)) return false
  if (isPlanLimitPayload(data)) {
    showPlanLimitToast(data.error || PLAN_LIMIT_MESSAGE)
    return true
  }
  showPlanLimitToast()
  return true
}

/** Check + increment via POST /api/usage (exports, client-side project create). */
export async function trackClientUsage(metric: 'projects' | 'exports'): Promise<boolean> {
  if (metric === 'exports' && isExportUsageLimitBypassed()) return true
  try {
    const res = await fetch('/api/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, action: 'increment' }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      handlePlanLimitResponse(res, data)
      return false
    }
    return true
  } catch {
    return true
  }
}

/** Pre-flight check without incrementing. */
export async function checkClientUsage(metric: 'projects' | 'exports'): Promise<boolean> {
  if (metric === 'exports' && isExportUsageLimitBypassed()) return true
  try {
    const res = await fetch('/api/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, action: 'check' }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      handlePlanLimitResponse(res, data)
      return false
    }
    return true
  } catch {
    return true
  }
}

/** Increment after a successful server-side or client-side action (no pre-check). */
export async function incrementClientUsage(metric: 'projects' | 'exports'): Promise<void> {
  try {
    await fetch('/api/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, action: 'increment_only' }),
    })
  } catch {
    /* best-effort */
  }
}
