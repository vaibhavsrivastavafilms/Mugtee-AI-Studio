'use client'

import type { RecommendedNextStep } from '@/lib/quick-cut/recommended-next-steps'
import { tabToWorkspaceStage } from '@/lib/studio/workspace-stages'
import { GENERATION_STAGE_PANEL_SELECTOR } from '@/lib/quick-cut/view-script-navigation'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'

const PANEL_SWITCH_DELAY_MS = 280

function scrollToGenerationStagePanel() {
  document
    .querySelector(GENERATION_STAGE_PANEL_SELECTOR)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToRecommendTarget(target: string) {
  const el = document.querySelector(`[data-recommend-target="${target}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  scrollToGenerationStagePanel()
}

function triggerRecommendTarget(target: string) {
  const el = document.querySelector(
    `[data-recommend-target="${target}"]`
  ) as HTMLButtonElement | null
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.click()
    return
  }
  scrollToGenerationStagePanel()
}

/** Navigate workspace + stage panel for a recommended next step card. */
export function executeRecommendedNextStep(step: RecommendedNextStep) {
  if (step.tabTarget) {
    useQuickCutGenerationStore.getState().setActiveStageTab(step.tabTarget, true)
    const workspaceStage = tabToWorkspaceStage(step.tabTarget)
    if (workspaceStage) {
      useStudioWorkspaceStore.getState().setActiveStage(workspaceStage)
    }
  }

  window.setTimeout(() => {
    if (step.actionType === 'trigger-element' && step.scrollTarget) {
      triggerRecommendTarget(step.scrollTarget)
      return
    }
    if (step.scrollTarget) {
      scrollToRecommendTarget(step.scrollTarget)
      return
    }
    if (step.actionType === 'navigate-tab') {
      scrollToGenerationStagePanel()
    }
  }, PANEL_SWITCH_DELAY_MS)
}
