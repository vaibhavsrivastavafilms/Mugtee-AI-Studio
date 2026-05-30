'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadRecentProjects } from '@/lib/cinematic-projects'
import {
  summaryToCard,
  type ProjectCardModel,
} from '@/components/create/unified-projects-grid'

export function useProjectLibrary(limit = 24, filter: 'all' | 'downloaded' = 'all') {
  const [projects, setProjects] = useState<ProjectCardModel[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableUnavailable, setTableUnavailable] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { projects: rows, tableUnavailable: missing } = await loadRecentProjects(limit)
        if (!alive) return
        setTableUnavailable(missing)
        let cards = rows.map((row) => summaryToCard(row))
        if (filter === 'downloaded') {
          cards = cards.filter(
            (project) =>
              project.videoUrl ||
              project.hasPlayablePreview ||
              project.status === 'compile' ||
              project.status === 'complete' ||
              project.status === 'completed'
          )
        }
        setProjects(cards)
      } catch {
        if (alive) setProjects([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [limit, filter, reloadKey])

  return { projects, loading, tableUnavailable, reload, setProjects }
}
