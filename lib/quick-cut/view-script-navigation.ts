'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { openQuickCutProjectHref } from '@/lib/create/routes'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'

export const GENERATION_STAGE_PANEL_SELECTOR = '[data-generation-stage-panel]'

function scrollToGenerationStagePanel() {
  window.setTimeout(() => {
    document
      .querySelector(GENERATION_STAGE_PANEL_SELECTOR)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 120)
}

/** Pages that render {@link GenerationStagePanel} below the preview/results. */
export function hasGenerationStagePanel(pathname: string): boolean {
  return (
    pathname === '/studio/create' ||
    pathname.startsWith('/studio/create/') ||
    pathname === '/studio/quick-cut' ||
    pathname.startsWith('/studio/quick-cut/') ||
    pathname === '/studio/workspace' ||
    pathname.startsWith('/studio/project/')
  )
}

export function focusScriptStageInView() {
  useQuickCutGenerationStore.getState().setActiveStageTab('script', true)
  useStudioWorkspaceStore.getState().setActiveStage('script')
  scrollToGenerationStagePanel()
}

export function viewScriptNavigationTarget(
  pathname: string,
  savedProjectId: string | null
): 'in-view' | { href: string } {
  if (hasGenerationStagePanel(pathname)) return 'in-view'
  if (savedProjectId) {
    return { href: openQuickCutProjectHref(savedProjectId, 'script') }
  }
  return 'in-view'
}

export function useViewScriptNavigation(projectIdOverride?: string | null) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)

  const projectId = projectIdOverride ?? savedProjectId

  const navigateToScript = useCallback(() => {
    const target = viewScriptNavigationTarget(pathname, projectId)

    if (target === 'in-view') {
      setActiveStageTab('script', true)
      setActiveStage('script')
      scrollToGenerationStagePanel()
      return
    }

    router.push(target.href)
  }, [pathname, projectId, router, setActiveStage, setActiveStageTab])

  return { navigateToScript }
}
