'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  SponsoredPlacement,
  SponsoredPlacementType,
} from '@/lib/monetization/sponsored-placement-types'

const cache = new Map<string, { at: number; items: SponsoredPlacement[] }>()
const CACHE_MS = 60_000

export function useSponsoredPlacements(placementType: SponsoredPlacementType) {
  const [placements, setPlacements] = useState<SponsoredPlacement[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const cached = cache.get(placementType)
    if (cached && Date.now() - cached.at < CACHE_MS) {
      setPlacements(cached.items)
      setLoading(false)
      return cached.items
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/sponsored-placements?placement=${encodeURIComponent(placementType)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        setPlacements([])
        return []
      }
      const data = (await res.json()) as { items?: SponsoredPlacement[] }
      const items = Array.isArray(data.items) ? data.items : []
      cache.set(placementType, { at: Date.now(), items })
      setPlacements(items)
      return items
    } catch {
      setPlacements([])
      return []
    } finally {
      setLoading(false)
    }
  }, [placementType])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { placements, loading, refresh }
}

export function clearSponsoredPlacementsCache() {
  cache.clear()
}
