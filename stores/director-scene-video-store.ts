'use client'

import { create } from 'zustand'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneVideoStatus } from '@/lib/video/providers/video-provider'

export type DirectorSceneVideoState = {
  sceneId: string
  id?: string
  status: SceneVideoStatus
  videoUrl?: string | null
  errorMessage?: string | null
  sourceImageUrl?: string | null
}

type DirectorSceneVideoStore = {
  projectId: string | null
  sceneVideoStatus: Record<string, DirectorSceneVideoState>
  projectScenes: GeneratedScene[]
  loading: boolean
  generatingSceneId: string | null
  error: string | null
  pollTimers: Record<string, ReturnType<typeof setInterval>>

  setProjectId: (id: string | null) => void
  loadSceneVideos: (projectId: string) => Promise<void>
  generateSceneVideo: (sceneId: string, motionPlan?: unknown) => Promise<void>
  pollStatus: (jobId: string, sceneId: string) => void
  stopPolling: (sceneId: string) => void
  reset: () => void
}

const initialState = {
  projectId: null as string | null,
  sceneVideoStatus: {} as Record<string, DirectorSceneVideoState>,
  projectScenes: [] as GeneratedScene[],
  loading: false,
  generatingSceneId: null as string | null,
  error: null as string | null,
  pollTimers: {} as Record<string, ReturnType<typeof setInterval>>,
}

export const useDirectorSceneVideoStore = create<DirectorSceneVideoStore>((set, get) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),

  loadSceneVideos: async (projectId) => {
    set({ loading: true, error: null, projectId })
    try {
      const res = await fetch(
        `/api/director/video/generate?projectId=${encodeURIComponent(projectId)}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load scene videos')

      const statusMap: Record<string, DirectorSceneVideoState> = {}
      for (const row of data.sceneVideos ?? []) {
        statusMap[row.sceneId] = {
          sceneId: row.sceneId,
          id: row.id,
          status: row.status,
          videoUrl: row.videoUrl,
          errorMessage: row.errorMessage,
          sourceImageUrl: row.sourceImageUrl,
        }
      }

      set({
        sceneVideoStatus: statusMap,
        projectScenes: data.scenes ?? [],
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load scene videos',
      })
    }
  },

  generateSceneVideo: async (sceneId, motionPlan) => {
    const projectId = get().projectId
    if (!projectId) return

    set({
      generatingSceneId: sceneId,
      error: null,
      sceneVideoStatus: {
        ...get().sceneVideoStatus,
        [sceneId]: {
          sceneId,
          status: 'queued',
        },
      },
    })

    try {
      const res = await fetch('/api/director/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sceneId, motionPlan, async: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      set({
        generatingSceneId: null,
        sceneVideoStatus: {
          ...get().sceneVideoStatus,
          [sceneId]: {
            sceneId,
            id: data.id,
            status: data.status ?? 'queued',
            videoUrl: data.videoUrl ?? null,
          },
        },
      })

      if (data.id) {
        get().pollStatus(data.id, sceneId)
      }
    } catch (e) {
      set({
        generatingSceneId: null,
        error: e instanceof Error ? e.message : 'Generation failed',
        sceneVideoStatus: {
          ...get().sceneVideoStatus,
          [sceneId]: {
            sceneId,
            status: 'failed',
            errorMessage: e instanceof Error ? e.message : 'Generation failed',
          },
        },
      })
    }
  },

  pollStatus: (jobId, sceneId) => {
    get().stopPolling(sceneId)

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/director/video/${jobId}`)
        const data = await res.json()
        if (!res.ok) return

        set({
          sceneVideoStatus: {
            ...get().sceneVideoStatus,
            [sceneId]: {
              sceneId,
              id: data.id,
              status: data.status,
              videoUrl: data.videoUrl,
              errorMessage: data.errorMessage,
              sourceImageUrl: data.sourceImageUrl,
            },
          },
        })

        if (data.status === 'completed' || data.status === 'failed') {
          get().stopPolling(sceneId)
          set({ generatingSceneId: null })
        }
      } catch {
        // keep polling
      }
    }, 3000)

    set({ pollTimers: { ...get().pollTimers, [sceneId]: timer } })
  },

  stopPolling: (sceneId) => {
    const timer = get().pollTimers[sceneId]
    if (timer) clearInterval(timer)
    const next = { ...get().pollTimers }
    delete next[sceneId]
    set({ pollTimers: next })
  },

  reset: () => {
    const timers = get().pollTimers
    for (const timer of Object.values(timers)) clearInterval(timer)
    set({ ...initialState })
  },
}))
