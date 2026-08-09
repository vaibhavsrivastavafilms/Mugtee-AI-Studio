'use client'

import { useEffect, useMemo, useState } from 'react'
import { computeV7ProductionProgress, type V7ProductionProgress } from '@/lib/v7/production-progress'
import type { V7ProductionSnapshot } from '@/types/v7/production'

const ETA_TICK_MS = 1000

export function useProductionProgress(
  snapshot: V7ProductionSnapshot | null
): V7ProductionProgress | null {
  const [now, setNow] = useState(() => new Date())

  const isActive =
    snapshot != null &&
    snapshot.production.status !== 'completed' &&
    snapshot.production.status !== 'failed'

  useEffect(() => {
    if (!isActive) return
    const timer = window.setInterval(() => setNow(new Date()), ETA_TICK_MS)
    return () => window.clearInterval(timer)
  }, [isActive])

  return useMemo(() => {
    if (!snapshot) return null
    return computeV7ProductionProgress(snapshot, now)
  }, [snapshot, now])
}
