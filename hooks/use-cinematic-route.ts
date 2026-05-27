'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import {
  useCinematicProjectStore,
  type CinematicProjectStatus,
} from '@/stores/cinematic-project'

/**
 * Keeps the shared cinematic workflow store aligned with the active route.
 * Hydrates persisted projects from ?project= and creates a draft when needed.
 */
export function useCinematicRoute(step: CinematicProjectStatus) {
  const searchParams = useSearchParams()
  const hydratingRef = useRef<string | null>(null)
  const failedHydrationRef = useRef<Set<string>>(new Set())

  const store = useCinematicProjectStore(
    useShallow((s) => ({
      id: s.id,
      persistedId: s.persistedId,
      isHydrating: s.isHydrating,
      saveState: s.saveState,
      title: s.title,
      prompt: s.prompt,
      style: s.style,
      duration: s.duration,
      hook: s.hook,
      summary: s.summary,
      script: s.script,
      scenes: s.scenes,
      voice: s.voice,
      captions: s.captions,
      captionLines: s.captionLines,
      suggestedVoiceStyle: s.suggestedVoiceStyle,
      niche: s.niche,
      status: s.status,
      updateStatus: s.updateStatus,
      createProject: s.createProject,
      hydrateProject: s.hydrateProject,
      persistProject: s.persistProject,
      resetProject: s.resetProject,
      updatePrompt: s.updatePrompt,
      updateStyle: s.updateStyle,
      updateDuration: s.updateDuration,
      updateHook: s.updateHook,
      updateSummary: s.updateSummary,
      updateScript: s.updateScript,
      updateScenes: s.updateScenes,
      updateCaptionLines: s.updateCaptionLines,
      updateSuggestedVoiceStyle: s.updateSuggestedVoiceStyle,
      updateVoice: s.updateVoice,
    }))
  )

  useEffect(() => {
    const projectId = searchParams?.get('project') ?? null
    const state = useCinematicProjectStore.getState()

    if (projectId) {
      if (
        state.persistedId === projectId ||
        (state.id === projectId && !state.isHydrating)
      ) {
        if (state.status !== step) state.updateStatus(step)
        return
      }

      if (hydratingRef.current === projectId) return
      if (failedHydrationRef.current.has(projectId)) return

      hydratingRef.current = projectId

      void state.hydrateProject(projectId).finally(() => {
        hydratingRef.current = null
        const latest = useCinematicProjectStore.getState()
        if (latest.saveState === 'error' && latest.persistedId !== projectId) {
          failedHydrationRef.current.add(projectId)
          return
        }
        if (latest.status !== step) latest.updateStatus(step)
      })
      return
    }

    if (!state.id) {
      state.createProject({ status: step })
      return
    }

    if (state.status !== step) {
      state.updateStatus(step)
    }
  }, [step, searchParams])

  return store
}

export function useCinematicHydrating() {
  return useCinematicProjectStore((s) => s.isHydrating)
}
