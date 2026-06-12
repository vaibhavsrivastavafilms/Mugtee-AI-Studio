'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { stageTabFromSearchParams, STUDIO } from '@/lib/create/routes'
import { loadContentLanguagePreference } from '@/lib/cinematic/content-languages'
import {
  DEFAULT_DIRECTOR_MODE,
  loadDirectorModePreference,
} from '@/lib/cinematic/director-modes'
import { clearQuickCutPending, loadQuickCutPending } from '@/lib/cinematic/quick-cut/preview-session'
import { QUICK_PLATFORM_OPTIONS, type QuickPlatformValue } from '@/lib/studio/quick-create-options'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type HydrationOptions = {
  platform?: QuickPlatformValue
}

/** Loads a saved Quick Cut project and optionally auto-starts generation. */
export function useQuickCutProjectHydration(
  projectId: string | undefined,
  options?: HydrationOptions
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stageTab = stageTabFromSearchParams(searchParams)
  const regenPipeline = searchParams?.get('regen') === '1'
  const autorunPipeline = searchParams?.get('autorun') === '1'
  const platformParam = searchParams?.get('platform') ?? undefined
  const platform =
    options?.platform ??
    QUICK_PLATFORM_OPTIONS.find((o) => o.value === platformParam)?.value ??
    ('youtube_short' as QuickPlatformValue)

  const loadSavedProject = useQuickCutGenerationStore((s) => s.loadSavedProject)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const hydratingRef = useRef<string | null>(null)
  const pipelineStartedRef = useRef(false)

  useEffect(() => {
    if (!projectId) return

    const mode = regenPipeline ? 'regen' : autorunPipeline ? 'autorun' : 'open'
    const stageKey = `${stageTab ?? 'default'}:${mode}`
    const hydrationKey = `${projectId}:${stageKey}`
    if (hydratingRef.current === hydrationKey) return

    hydratingRef.current = hydrationKey
    void loadSavedProject(projectId, stageTab ? { stageTab } : undefined)
      .then((ok) => {
        if (!ok) {
          const live = useQuickCutGenerationStore.getState()
          if (live.isGenerating && live.savedProjectId === projectId) return
          router.replace(STUDIO.projects)
          return
        }

        const shouldAutorun = autorunPipeline && !pipelineStartedRef.current
        const shouldRegen = regenPipeline && !pipelineStartedRef.current
        if (!shouldAutorun && !shouldRegen) return

        const pending = loadQuickCutPending()
        const state = useQuickCutGenerationStore.getState()
        const prompt = (pending?.prompt ?? state.prompt).trim()
        if (prompt.length < 6) return

        pipelineStartedRef.current = true
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('autorun')
          url.searchParams.delete('regen')
          window.history.replaceState({}, '', url.pathname + url.search)
        }

        void runPipeline({
          prompt,
          style: pending?.style ?? state.style,
          duration: pending?.duration ?? state.duration,
          platform,
          language: pending?.language ?? state.language ?? loadContentLanguagePreference(),
          directorMode:
            pending?.directorMode ?? loadDirectorModePreference() ?? DEFAULT_DIRECTOR_MODE,
          reuseProject: true,
          skipResearch: true,
          ...(shouldRegen ? { regenFresh: true, originalTranscript: state.originalTranscript } : {}),
        }).finally(() => clearQuickCutPending())
      })
      .finally(() => {
        if (hydratingRef.current === hydrationKey) {
          hydratingRef.current = null
        }
      })
  }, [
    projectId,
    stageTab,
    regenPipeline,
    autorunPipeline,
    platform,
    loadSavedProject,
    runPipeline,
    router,
  ])
}
