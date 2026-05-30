'use client'

import { toast } from 'sonner'
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

export function showPlanLimitToast(message = PLAN_LIMIT_MESSAGE) {
  toast.error(message, {
    action: {
      label: 'Upgrade Coming Soon',
      onClick: () => {
        window.location.hash = 'upgrade'
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
