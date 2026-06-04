'use client'

import { toast } from 'sonner'

export const MP4_PRO_ONLY_MSG = 'MP4 export is a Pro feature — upgrade to export'

export type ProfilePlanSnapshot = {
  planType: string
  trialActive: boolean
}

export function isMp4CompileAllowedForPlan(
  planType: string,
  options?: { trialActive?: boolean; isUnlimited?: boolean }
): boolean {
  if (options?.isUnlimited || options?.trialActive) return true
  const normalized = String(planType || 'FREE').toUpperCase()
  return normalized === 'PRO' || normalized === 'CREATOR' || normalized === 'PRO_TRIAL'
}

/** Best-effort profile read for export gates (same source as useUsage trial bootstrap). */
export async function fetchProfilePlanSnapshot(): Promise<ProfilePlanSnapshot> {
  try {
    const res = await fetch('/api/profile', { cache: 'no-store' })
    if (!res.ok) return { planType: 'FREE', trialActive: false }
    const data = (await res.json()) as {
      plan_type?: string
      is_trial_active?: boolean
    }
    return {
      planType: String(data.plan_type || 'FREE'),
      trialActive: Boolean(data.is_trial_active),
    }
  } catch {
    return { planType: 'FREE', trialActive: false }
  }
}

/**
 * When true, callers must not invoke compile/render handlers.
 * Shows upgrade toast (existing pricing pattern).
 */
export function blockMp4CompileIfNeeded(
  planType: string,
  options?: { trialActive?: boolean; isUnlimited?: boolean; logContext?: Record<string, unknown> }
): boolean {
  if (isMp4CompileAllowedForPlan(planType, options)) return false
  console.error('[EXPORT] MP4 compile blocked for plan', {
    planType,
    ...options?.logContext,
  })
  toast.error(MP4_PRO_ONLY_MSG, {
    duration: 8000,
    action: {
      label: 'View plans',
      onClick: () => {
        window.location.href = '/pricing'
      },
    },
  })
  return true
}
