'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createEntryHref, stageTabFromSearchParams } from '@/lib/create/routes'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Loads a saved Quick Cut project from the dedicated project workspace route. */
export function useQuickCutProjectHydration(projectId: string | undefined) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stageTab = stageTabFromSearchParams(searchParams)
  const regenPipeline = searchParams?.get('regen') === '1'
  const loadSavedProject = useQuickCutGenerationStore((s) => s.loadSavedProject)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const hydratingRef = useRef<string | null>(null)
  const regenStartedRef = useRef(false)

  useEffect(() => {
    if (!projectId) return

    const stageKey = `${stageTab ?? 'default'}:${regenPipeline ? 'regen' : 'open'}`
    const hydrationKey = `${projectId}:${stageKey}`
    if (hydratingRef.current === hydrationKey) return

    hydratingRef.current = hydrationKey
    void loadSavedProject(projectId, stageTab ? { stageTab } : undefined)
      .then((ok) => {
        if (!ok) {
          router.replace(createEntryHref('quick'))
          return
        }

        if (!regenPipeline || regenStartedRef.current) return
        const state = useQuickCutGenerationStore.getState()
        const prompt = state.prompt.trim()
        if (prompt.length < 6) return

        regenStartedRef.current = true
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('regen')
          window.history.replaceState({}, '', url.pathname + url.search)
        }

        void runPipeline({
          prompt,
          style: state.style,
          duration: state.duration,
          reuseProject: true,
          regenFresh: true,
          originalTranscript: state.originalTranscript,
        })
      })
      .finally(() => {
        if (hydratingRef.current === hydrationKey) {
          hydratingRef.current = null
        }
      })
  }, [projectId, stageTab, regenPipeline, loadSavedProject, runPipeline, router])
}
