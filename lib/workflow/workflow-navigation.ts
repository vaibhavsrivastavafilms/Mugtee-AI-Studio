'use client'



import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'

import { isStageTabReachable } from '@/lib/cinematic/quick-cut/stage-tabs'

import { GENERATION_STAGE_PANEL_SELECTOR } from '@/lib/quick-cut/view-script-navigation'

import { tabToWorkspaceStage } from '@/lib/studio/workspace-stages'

import type { MissionStep } from '@/lib/mission/mission-steps'

import { MISSION_STEPS } from '@/lib/mission/mission-steps'

import { saveWorkflowSession } from '@/lib/workflow/workflow-session'

import {

  TAB_TO_WORKFLOW_STEP,

  WORKFLOW_STEP_TO_TAB,

  workflowStepFromTab,

  type WorkflowStepId,

} from '@/lib/workflow/workflow-step-map'

import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'



export type { WorkflowStepId }

export { WORKFLOW_STEP_TO_TAB, TAB_TO_WORKFLOW_STEP, workflowStepFromTab }



export const WORKFLOW_SECTION_SELECTOR = '[data-workflow-section]'



const PANEL_SWITCH_DELAY_MS = 280



function scrollToGenerationStagePanel() {

  document

    .querySelector(GENERATION_STAGE_PANEL_SELECTOR)

    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

}



export function scrollToWorkflowSection(stepId: WorkflowStepId) {

  const section = document.querySelector(`[data-workflow-section="${stepId}"]`)

  if (section) {

    section.scrollIntoView({ behavior: 'smooth', block: 'start' })

    return true

  }

  scrollToGenerationStagePanel()

  return false

}



function persistWorkflowNavigation(stepId: WorkflowStepId) {

  const store = useQuickCutGenerationStore.getState()

  store.setCurrentWorkflowStep(stepId)

  saveWorkflowSession({

    currentWorkflowStep: stepId,

    completedWorkflowSteps: store.completedWorkflowSteps,

    lastVisitedStep: stepId,

    projectId: store.savedProjectId,

    lastGeneratedAsset: store.lastCompletedStep,

  })

}



function updateWorkflowHash(stepId: WorkflowStepId) {

  if (typeof window === 'undefined') return

  const hash = `#${stepId}`

  const url = `${window.location.pathname}${window.location.search}${hash}`

  window.history.replaceState(null, '', url)

}



/**

 * Navigate to a workflow step: sync tab/workspace, scroll to stacked section,

 * update URL hash, and persist continuity state.

 */

export function navigateToStep(stepId: WorkflowStepId): void {

  const step = MISSION_STEPS.find((s) => s.id === stepId)

  if (!step) return



  const store = useQuickCutGenerationStore.getState()

  const tab = WORKFLOW_STEP_TO_TAB[stepId]



  if (tab) {

    const reachable = isStageTabReachable(tab, store.generationStep, store.isComplete)

    if (!reachable && !store.isComplete) return

    store.setActiveStageTab(tab, true)

    const workspaceStage = tabToWorkspaceStage(tab)

    if (workspaceStage) {

      useStudioWorkspaceStore.getState().setActiveStage(workspaceStage)

    }

  }



  updateWorkflowHash(stepId)

  persistWorkflowNavigation(stepId)



  window.setTimeout(() => {

    if (!scrollToWorkflowSection(stepId)) {

      scrollToGenerationStagePanel()

    }

  }, PANEL_SWITCH_DELAY_MS)

}



/** Apply `#stepId` hash from URL on load (e.g. `#hook`). */

export function applyWorkflowHashFromLocation(): void {

  if (typeof window === 'undefined') return

  const raw = window.location.hash.replace(/^#/, '')

  if (!raw) return

  const step = MISSION_STEPS.find((s) => s.id === raw)

  if (step) navigateToStep(step.id)

}


