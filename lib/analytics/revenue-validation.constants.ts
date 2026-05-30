/** Canonical revenue validation event types (revenue_events.event_type). */
export const RevenueEventTypes = {
  PRICING_PAGE_VISITS: 'pricing_page_visits',
  UPGRADE_CLICKS: 'upgrade_clicks',
  PLAN_INTEREST: 'plan_interest',
  PAYMENT_ATTEMPTS: 'payment_attempts',
} as const

export type RevenueEventType = (typeof RevenueEventTypes)[keyof typeof RevenueEventTypes]

const LEGACY_EVENT_MAP: Record<string, RevenueEventType> = {
  pricing_page_visit: RevenueEventTypes.PRICING_PAGE_VISITS,
  pricing_page_view: RevenueEventTypes.PRICING_PAGE_VISITS,
  upgrade_click: RevenueEventTypes.UPGRADE_CLICKS,
  payment_attempt: RevenueEventTypes.PAYMENT_ATTEMPTS,
}

export function normalizeRevenueEventType(raw: string): RevenueEventType | null {
  const key = raw.trim().toLowerCase()
  if ((Object.values(RevenueEventTypes) as string[]).includes(key)) {
    return key as RevenueEventType
  }
  return LEGACY_EVENT_MAP[key] ?? null
}
