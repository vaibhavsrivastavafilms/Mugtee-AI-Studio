'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { V3_RUNNABLE_AGENTS } from '@/lib/v3/pipeline'
import type { V3ProjectSnapshot } from '@/types/v3/production'

function needsPipelineAdvance(snapshot: V3ProjectSnapshot): boolean {
  const jobByAgent = new Map(snapshot.jobs.map((j) => [j.agent, j]))
  const planner = jobByAgent.get('planner')
  if (planner?.status !== 'completed') return false

  return V3_RUNNABLE_AGENTS.some((agent) => jobByAgent.get(agent)?.status === 'queued')
}

export function useV3Project(projectId: string) {
  const [snapshot, setSnapshot] = useState<V3ProjectSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const runningRef = useRef(false)

  const load = useCallback(
    async (options?: { skipAdvance?: boolean }) => {
      const res = await fetch(`/api/v3/projects/${projectId}`, { cache: 'no-store' })
      const data = (await res.json()) as V3ProjectSnapshot & { error?: string; ok?: boolean }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')

      setSnapshot(data)
      setError(null)
      setLoading(false)

      if (!options?.skipAdvance && needsPipelineAdvance(data) && !runningRef.current) {
        runningRef.current = true
        try {
          const runRes = await fetch(`/api/v3/projects/${projectId}/run`, {
            method: 'POST',
            cache: 'no-store',
          })
          const runData = (await runRes.json()) as V3ProjectSnapshot & { error?: string }
          if (runRes.ok) {
            setSnapshot(runData)
          } else if (runData.error) {
            setError(runData.error)
          }
        } finally {
          runningRef.current = false
        }
      }
    },
    [projectId]
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function tick() {
      try {
        await load()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
          setLoading(false)
        }
      }
    }

    void tick()
    timer = setInterval(() => void tick(), 4000)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [load])

  const reload = useCallback(async () => {
    try {
      await load({ skipAdvance: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [load])

  return { snapshot, error, loading, reload }
}
