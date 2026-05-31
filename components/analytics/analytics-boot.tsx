'use client'
// MUGTEE V4.0 — Analytics boot. Mounted ONCE in the root layout so PostHog is
// initialized on first page load and we emit the visitor_opened_site event.
//
// SSR-safe (only fires inside a useEffect).

import { useEffect } from 'react'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { initPostHog, track } from '@/lib/posthog'

export function AnalyticsBoot() {
  useEffect(() => {
    initPostHog()
    const firstVisit = !document.referrer || !document.referrer.includes(location.host)
    trackEvent(AnalyticsEvents.LANDING_PAGE_VIEWED, { metadata: { first_visit: firstVisit } })
    trackEvent(AnalyticsEvents.HOMEPAGE_VISIT, { metadata: { first_visit: firstVisit } })
    track(AnalyticsEvents.HOMEPAGE_VISIT, { first_visit: firstVisit })
    track('visitor_opened_site', { first_visit: firstVisit })
  }, [])
  return null
}

export default AnalyticsBoot
