'use client'

import { useLayoutEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/**
 * Bare `/studio/create?mode=quick` (no project id) must always open a fresh canvas.
 * Resets before child effects run. Skips only while a pipeline is actively in-flight
 * (e.g. after `resume=1` strips the param mid-orchestration).
 */
export function useQuickCutFreshCreateEntry() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useLayoutEffect(() => {
    if (!pathname?.includes('/create')) return

    const state = useQuickCutGenerationStore.getState()
    if (state.isGenerating && state.generationInFlight) return

    resetQuickCutForFreshCreate()
  }, [pathname, searchParams])
}
