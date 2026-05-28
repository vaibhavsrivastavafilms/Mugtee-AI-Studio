'use client'

import { useEffect, useRef } from 'react'
import {
  useCinematicProjectStore,
  type CinematicProjectStatus,
} from '@/stores/cinematic-project'

/** Hydrates the shared cinematic store from /create/[projectId] path segments. */
export function useCreateProjectHydration(
  projectId: string | undefined,
  step: CinematicProjectStatus
) {
  const hydratingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    const state = useCinematicProjectStore.getState()

    if (state.persistedId === projectId && !state.isHydrating) {
      if (state.status !== step) state.updateStatus(step)
      return
    }

    if (hydratingRef.current === projectId) return

    hydratingRef.current = projectId
    void state.hydrateProject(projectId).finally(() => {
      hydratingRef.current = null
      const latest = useCinematicProjectStore.getState()
      if (latest.status !== step) latest.updateStatus(step)
    })
  }, [projectId, step])
}
