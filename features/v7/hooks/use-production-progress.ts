'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeV7ProductionProgress,
  smoothEtaRemainingMs,
  type V7ProductionProgress,
} from '@/lib/v7/production-progress'
import type { V7ProductionSnapshot } from '@/types/v7/production'

const ETA_TICK_MS = 1000

type HistoryStats = {
  averageMs: number | null
  sampleCount: number
}

export function useProductionProgress(
  snapshot: V7ProductionSnapshot | null
): V7ProductionProgress | null {
  const [now, setNow] = useState(() => new Date())
  const [history, setHistory] = useState<HistoryStats | null>(null)
  const smoothedEtaRef = useRef<number | null>(null)

  const isActive =
    snapshot != null &&
    snapshot.production.status !== 'completed' &&
    snapshot.production.status !== 'failed'

  useEffect(() => {
    if (!isActive) return
    const timer = window.setInterval(() => setNow(new Date()), ETA_TICK_MS)
    return () => window.clearInterval(timer)
  }, [isActive])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/v7/productions/history-stats', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as HistoryStats & { ok?: boolean }
        if (!cancelled) {
          setHistory({
            averageMs: typeof data.averageMs === 'number' ? data.averageMs : null,
            sampleCount: typeof data.sampleCount === 'number' ? data.sampleCount : 0,
          })
        }
      } catch {
        /* non-blocking */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => {
    if (!snapshot) return null

    const raw = computeV7ProductionProgress(snapshot, now, {
      historicalAverageMs: history?.averageMs ?? null,
    })

    if (raw.eta.frozen || raw.eta.remainingMs == null) {
      smoothedEtaRef.current = null
      return raw
    }

    smoothedEtaRef.current = smoothEtaRemainingMs(smoothedEtaRef.current, raw.eta.remainingMs)

    return computeV7ProductionProgress(snapshot, now, {
      historicalAverageMs: history?.averageMs ?? null,
      smoothedRemainingMs: smoothedEtaRef.current,
    })
  }, [snapshot, now, history])
}
