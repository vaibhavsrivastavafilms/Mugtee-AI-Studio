'use client'

import { useLayoutEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/**
 * Bare `/studio/quick` (no project id) must always open a fresh canvas.
 * Resets before child effects run. Skips only while a pipeline is actively in-flight
 * (e.g. after `resume=1` strips the param mid-orchestration).
 */
export function useQuickCutFreshCreateEntry() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useLayoutEffect(() => {
    const isQuickEntry =
      pathname?.includes('/studio/quick') ||
      (pathname?.includes('/create') && searchParams?.get('mode') === 'quick')

    if (!isQuickEntry) return
    if (searchParams?.get('project')) return

    const state = useQuickCutGenerationStore.getState()
    if (state.isGenerating && state.generationInFlight) return

    resetQuickCutForFreshCreate()
  }, [pathname, searchParams])
}
