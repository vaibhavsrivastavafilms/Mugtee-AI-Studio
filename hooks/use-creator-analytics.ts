'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadRecentProjectRows } from '@/lib/cinematic-projects'
import {
  aggregateCreatorAnalytics,
  analyticsProjectFromRow,
  type CreatorAnalyticsSnapshot,
} from '@/lib/creator/analytics-dashboard'
import type { UsageSnapshot } from '@/lib/usage/usage-tracker'

const DEFAULT_SAMPLE_LIMIT = 500

async function fetchExportsCount(): Promise<number | null> {
  try {
    const res = await fetch('/api/usage', { credentials: 'include' })
    if (!res.ok) return null
    const data = (await res.json()) as UsageSnapshot
    return typeof data.used?.exports === 'number' ? data.used.exports : null
  } catch {
    return null
  }
}

export function useCreatorAnalytics(sampleLimit = DEFAULT_SAMPLE_LIMIT) {
  const [snapshot, setSnapshot] = useState<CreatorAnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableUnavailable, setTableUnavailable] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const [{ rows, tableUnavailable: missing }, exportsDownloaded] = await Promise.all([
          loadRecentProjectRows(sampleLimit),
          fetchExportsCount(),
        ])
        if (!alive) return
        setTableUnavailable(missing)
        const projects = rows.map(analyticsProjectFromRow)
        const nextSnapshot = aggregateCreatorAnalytics(projects, {
          exportsDownloaded,
          sampleLimit,
        })
        setSnapshot(nextSnapshot)
      } catch {
        if (alive) setSnapshot(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [sampleLimit, reloadKey])

  return { snapshot, loading, tableUnavailable, reload }
}
