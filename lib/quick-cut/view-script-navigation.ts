'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { openQuickCutProjectHref } from '@/lib/create/routes'
import { navigateToStep } from '@/lib/workflow/workflow-navigation'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

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
  navigateToStep('script')
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

  const projectId = projectIdOverride ?? savedProjectId

  const navigateToScript = useCallback(() => {
    const target = viewScriptNavigationTarget(pathname, projectId)

    if (target === 'in-view') {
      navigateToStep('script')
      return
    }

    router.push(target.href)
  }, [pathname, projectId, router])

  return { navigateToScript }
}
