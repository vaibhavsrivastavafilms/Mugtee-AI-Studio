'use client'

import { useCallback, useState } from 'react'
import type { WorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'

export type WorkspaceApiResponse = {
  ok: boolean
  production: V7ProductionSnapshot['production']
  stages: V7ProductionSnapshot['stages']
  scenes: V7ProductionSnapshot['scenes']
  timeline: V7ProductionSnapshot['timeline']
  workspace: WorkspacePayload
  plan?: unknown
}

export function useProductionWorkspace(productionId: string) {
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyResponse = useCallback((data: WorkspaceApiResponse) => {
    setWorkspace(data.workspace)
    return data
  }, [])

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v7/productions/${productionId}/workspace`, { cache: 'no-store' })
      const data = (await res.json()) as WorkspaceApiResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load workspace')
      return applyResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace')
      return null
    } finally {
      setLoading(false)
    }
  }, [applyResponse, productionId])

  const runAction = useCallback(
    async (action: 'cancel' | 'close' | 'reopen') => {
      const res = await fetch(`/api/v7/productions/${productionId}/workspace/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = (await res.json()) as WorkspaceApiResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Action failed')
      applyResponse(data)
      return data
    },
    [applyResponse, productionId]
  )

  const saveScript = useCallback(
    async (scenes: Array<{ number: number; narration?: string; action?: string; duration?: number; camera?: string; lighting?: string }>) => {
      const res = await fetch(`/api/v7/productions/${productionId}/workspace/script`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes }),
      })
      const data = (await res.json()) as WorkspaceApiResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Script save failed')
      applyResponse(data)
      return data
    },
    [applyResponse, productionId]
  )

  const saveVoice = useCallback(
    async (narrationSegments: Array<{ sceneNumber: number; text: string }>) => {
      const res = await fetch(`/api/v7/productions/${productionId}/workspace/voice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrationSegments }),
      })
      const data = (await res.json()) as WorkspaceApiResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Voice save failed')
      applyResponse(data)
      return data
    },
    [applyResponse, productionId]
  )

  const continueScene = useCallback(
    async (params: {
      afterSceneId: string
      continuationIdea: string
      narration?: string
      durationSec?: number
      generateMedia?: boolean
    }) => {
      const res = await fetch(`/api/v7/productions/${productionId}/workspace/continue-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = (await res.json()) as WorkspaceApiResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Continue scene failed')
      applyResponse(data)
      return data
    },
    [applyResponse, productionId]
  )

  const regenerate = useCallback(
    async (mode: 'affected' | 'keep' | 'scene', sceneId?: string) => {
      const res = await fetch(`/api/v7/productions/${productionId}/workspace/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, sceneId }),
      })
      const data = (await res.json()) as WorkspaceApiResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Regeneration failed')
      applyResponse(data)
      return data
    },
    [applyResponse, productionId]
  )

  return {
    workspace,
    setWorkspace,
    loading,
    error,
    loadWorkspace,
    runAction,
    saveScript,
    saveVoice,
    continueScene,
    regenerate,
  }
}

export function assetDownloadHref(productionId: string, kind: string, sceneId?: string): string {
  const params = new URLSearchParams({ kind })
  if (sceneId) params.set('sceneId', sceneId)
  return `/api/v7/productions/${productionId}/assets?${params.toString()}`
}
