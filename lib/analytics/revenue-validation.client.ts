'use client'

import type { PlanInterest } from '@/lib/billing/plan-catalog'
import {
  normalizeRevenueEventType,
  RevenueEventTypes,
  type RevenueEventType,
} from '@/lib/analytics/revenue-validation.constants'

export { RevenueEventTypes, normalizeRevenueEventType, type RevenueEventType }

type ClientTrackPayload = {
  eventType: RevenueEventType | string
  planInterest?: PlanInterest | string | null
  source?: string | null
  metadata?: Record<string, unknown>
}

/** Fire-and-forget revenue validation track (Phase 8). */
export function trackRevenueValidation(payload: ClientTrackPayload): void {
  if (typeof window === 'undefined') return
  const normalized =
    typeof payload.eventType === 'string'
      ? normalizeRevenueEventType(payload.eventType)
      : payload.eventType
  if (!normalized) return

  try {
    const session = sessionStorage.getItem('mugtee:analytics-session:v1')
    fetch('/api/revenue/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: normalized,
        plan_interest: payload.planInterest ?? undefined,
        source: payload.source ?? undefined,
        session_id: session,
        metadata: payload.metadata ?? {},
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
