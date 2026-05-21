'use client'
// MUGTEE V4.0 — Analytics boot. Mounted ONCE in the root layout so PostHog is
// initialized on first page load and we emit the visitor_opened_site event.
//
// SSR-safe (only fires inside a useEffect).

import { useEffect } from 'react'
import { initPostHog, track } from '@/lib/posthog'

export function AnalyticsBoot() {
  useEffect(() => {
    initPostHog()
    // visitor_opened_site — fires on first mount of the root layout per browser tab.
    track('visitor_opened_site', {
      first_visit: !document.referrer || !document.referrer.includes(location.host),
    })
  }, [])
  return null
}

export default AnalyticsBoot
