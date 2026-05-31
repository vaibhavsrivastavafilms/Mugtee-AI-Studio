'use client'

import { useRef } from 'react'
import { trackEvent } from '@/lib/analytics/track-event'
import type { AnalyticsEventName } from '@/lib/analytics/events'

/** Lightweight IntersectionObserver — fires trackEvent once when section enters viewport. */
export function useViewTracker(
  event: AnalyticsEventName | string,
  metadata?: Record<string, unknown>,
  threshold = 0.25
): (node: HTMLElement | null) => void {
  const fired = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  return (node: HTMLElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!node || fired.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (fired.current) return
        const visible = entries.some((e) => e.isIntersecting)
        if (!visible) return
        fired.current = true
        trackEvent(event, { metadata })
        observerRef.current?.disconnect()
      },
      { threshold, rootMargin: '0px 0px -10% 0px' }
    )
    observerRef.current.observe(node)
  }
}

export function ViewTrackerSection({
  event,
  metadata,
  className,
  children,
  as: Tag = 'div',
  id,
}: {
  event: AnalyticsEventName | string
  metadata?: Record<string, unknown>
  className?: string
  children: React.ReactNode
  as?: 'div' | 'section'
  id?: string
}) {
  const ref = useViewTracker(event, metadata)

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  )
}
