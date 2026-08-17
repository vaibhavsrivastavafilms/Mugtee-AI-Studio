'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { V7ProductionWorkspace } from '@/features/v7/components/production-workspace/production-workspace'
import { canRetryV7Production, resolveV7RetryStageId } from '@/lib/v7/production-progress'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'
import { isAwaitingConceptSelection } from '@/lib/v7/concept-selection.core'
import { readWorkspaceState } from '@/lib/v7/workspace/workspace-state.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'

export function V7ProductionShell({ productionId }: { productionId: string }) {
  const [snapshot, setSnapshot] = useState<V7ProductionSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const inFlightRef = useRef<AbortController | null>(null)
  const pollInFlightRef = useRef(false)

  const load = useCallback(async () => {
    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller
    pollInFlightRef.current = true

    try {
      const res = await fetch(`/api/v7/productions/${productionId}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (controller.signal.aborted) return

      if (!res.ok) {
        const data = (await res.json()) as { error?: string; message?: string }
        throw new Error(data.message ?? data.error ?? 'Failed to load production')
      }
      const data = (await res.json()) as V7ProductionSnapshot & { ok: boolean }
      if (controller.signal.aborted) return

      setSnapshot({
        production: data.production,
        stages: data.stages,
        scenes: data.scenes,
        timeline: data.timeline,
        pipeline_blocked: data.pipeline_blocked,
        block_reason: data.block_reason,
      })
      setError(null)
      setReconnecting(false)
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null
      }
      pollInFlightRef.current = false
    }
  }, [productionId])

  const retry = useCallback(async () => {
    if (!snapshot) return

    setRetrying(true)
    setError(null)
    try {
      const stage = resolveV7RetryStageId(snapshot)
      const res = await fetch(`/api/v7/productions/${productionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage ? { stage } : {}),
      })
      if (!res.ok) {
        const data = (await res.json()) as {
          error?: string
          message?: string
          reason?: string
          production?: V7ProductionSnapshot['production']
          stages?: V7ProductionSnapshot['stages']
          scenes?: V7ProductionSnapshot['scenes']
          timeline?: V7ProductionSnapshot['timeline']
        }
        if (data.production && data.stages && data.timeline) {
          setSnapshot({
            production: data.production,
            stages: data.stages,
            scenes: data.scenes ?? snapshot.scenes,
            timeline: data.timeline,
            pipeline_blocked: snapshot.pipeline_blocked,
            block_reason: snapshot.block_reason,
          })
        }
        throw new Error(data.reason ?? data.message ?? data.error ?? 'Retry failed')
      }
      const data = (await res.json()) as V7ProductionSnapshot & { ok: boolean }
      setSnapshot({
        production: data.production,
        stages: data.stages,
        scenes: data.scenes,
        timeline: data.timeline,
        pipeline_blocked: data.pipeline_blocked,
        block_reason: data.block_reason,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }, [productionId, snapshot])

  useEffect(() => {
    void load().catch((err) => {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Load failed')
    })

    return () => {
      inFlightRef.current?.abort()
    }
  }, [load])

  useEffect(() => {
    if (!snapshot || retrying) return
    if (readWorkspaceState(snapshot.production.timeline_json).cancelledAt) return
    if (v7HasDeliverableMedia(snapshot.production)) return
    if (snapshot.production.status === 'completed') return
    if (snapshot.production.timeline_json && isAwaitingConceptSelection(snapshot.production.timeline_json)) {
      return
    }
    if (canRetryV7Production(snapshot)) return

    const timer = window.setInterval(() => {
      if (pollInFlightRef.current) return
      void load().catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setReconnecting(true)
      })
    }, 4000)

    return () => window.clearInterval(timer)
  }, [snapshot, retrying, load])

  if (error && !snapshot) {
    return <p className="py-20 text-center text-red-300/90">{error}</p>
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {error && !snapshot ? <p className="px-4 py-2 text-center text-sm text-red-300/90">{error}</p> : null}
      <V7ProductionWorkspace
        productionId={productionId}
        snapshot={snapshot}
        onRetry={canRetryV7Production(snapshot) ? retry : undefined}
        retrying={retrying}
        onConceptSelected={load}
        reconnecting={reconnecting}
        onSnapshotUpdate={(next) => setSnapshot(next)}
      />
    </>
  )
}
