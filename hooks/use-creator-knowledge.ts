'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadRecentProjectRows } from '@/lib/cinematic-projects'
import {
  aggregateKnowledgeFromProjects,
  knowledgeProjectFromRow,
  setCreatorKnowledgeCache,
  type CreatorKnowledgeAggregate,
  type KnowledgeProjectSource,
} from '@/lib/creator/knowledge-base'

export function useCreatorKnowledge(limit = 50) {
  const [aggregate, setAggregate] = useState<CreatorKnowledgeAggregate | null>(null)
  const [sources, setSources] = useState<KnowledgeProjectSource[]>([])
  const [loading, setLoading] = useState(true)
  const [tableUnavailable, setTableUnavailable] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { rows, tableUnavailable: missing } = await loadRecentProjectRows(limit)
        if (!alive) return
        setTableUnavailable(missing)
        const projectSources = rows.map(knowledgeProjectFromRow)
        const nextAggregate = aggregateKnowledgeFromProjects(projectSources)
        setSources(projectSources)
        setAggregate(nextAggregate)
        setCreatorKnowledgeCache(nextAggregate, projectSources)
      } catch {
        if (alive) {
          setSources([])
          setAggregate(null)
          setCreatorKnowledgeCache(null, [])
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [limit, reloadKey])

  return { aggregate, sources, loading, tableUnavailable, reload }
}
