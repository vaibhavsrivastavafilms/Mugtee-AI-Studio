'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSubscriptionTier } from '@/hooks/use-subscription-tier'
import { useSponsoredPlacements } from '@/hooks/use-sponsored-placements'
import { SponsoredPlacementCard } from '@/components/monetization/sponsored-placement-card'
import type { SponsoredPlacementType } from '@/lib/monetization/sponsored-placement-types'

const IMPRESSION_KEY = 'mugtee:sponsor-impression:v1'
const SESSION_CAP_KEY = 'mugtee:sponsor-session-cap:v1'
const MAX_SPONSOR_IMPRESSIONS_PER_SESSION = 12

function sessionCapReached(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const n = Number.parseInt(sessionStorage.getItem(SESSION_CAP_KEY) ?? '0', 10)
    return Number.isFinite(n) && n >= MAX_SPONSOR_IMPRESSIONS_PER_SESSION
  } catch {
    return false
  }
}

function incrementSessionCap(): void {
  if (typeof window === 'undefined') return
  try {
    const n = Number.parseInt(sessionStorage.getItem(SESSION_CAP_KEY) ?? '0', 10)
    sessionStorage.setItem(SESSION_CAP_KEY, String((Number.isFinite(n) ? n : 0) + 1))
  } catch {
    /* quota */
  }
}

function sessionImpressionKey(placementId: string): string {
  return `${IMPRESSION_KEY}:${placementId}`
}

function hasRecordedImpression(placementId: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    return sessionStorage.getItem(sessionImpressionKey(placementId)) === '1'
  } catch {
    return false
  }
}

function markImpressionRecorded(placementId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(sessionImpressionKey(placementId), '1')
  } catch {
    /* quota */
  }
}

type SponsoredPlacementSlotProps = {
  placementType: SponsoredPlacementType
  className?: string
  compact?: boolean
  /** Show at most N cards (default 1) */
  limit?: number
}

/**
 * Renders native sponsored cards for FREE users only.
 * PRO users see nothing — no layout shift (returns null).
 */
export function SponsoredPlacementSlot({
  placementType,
  className,
  compact = false,
  limit = 1,
}: SponsoredPlacementSlotProps) {
  const pathname = usePathname()
  const { showSponsoredContent } = useSubscriptionTier()
  const { placements, loading } = useSponsoredPlacements(placementType)
  const trackedRef = useRef<Set<string>>(new Set())

  const visible = useMemo(
    () => (showSponsoredContent ? placements.slice(0, limit) : []),
    [showSponsoredContent, placements, limit]
  )

  useEffect(() => {
    if (!showSponsoredContent || loading || visible.length === 0) return
    if (sessionCapReached()) return

    for (const placement of visible) {
      if (trackedRef.current.has(placement.id)) continue
      if (hasRecordedImpression(placement.id)) {
        trackedRef.current.add(placement.id)
        continue
      }

      trackedRef.current.add(placement.id)
      markImpressionRecorded(placement.id)
      incrementSessionCap()

      void fetch(`/api/sponsored-placements/${encodeURIComponent(placement.id)}/impression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagePath: pathname }),
        keepalive: true,
      }).catch(() => undefined)
    }
  }, [showSponsoredContent, loading, visible, pathname])

  if (!showSponsoredContent || loading || visible.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)} aria-label="Sponsored recommendations">
      {visible.map((placement) => (
        <SponsoredPlacementCard
          key={placement.id}
          placement={placement}
          compact={compact}
        />
      ))}
    </div>
  )
}
