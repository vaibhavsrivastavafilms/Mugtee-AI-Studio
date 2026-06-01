import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import type { MissionStep } from '@/lib/mission/mission-steps'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

export type WorkflowStepId = MissionStep['id']

/** Maps unified workflow step ids to output stage tabs. */
export const WORKFLOW_STEP_TO_TAB: Record<WorkflowStepId, QuickCutStageTab | null> = {
  analyze: 'title',
  angle: 'title',
  hook: 'hook',
  script: 'script',
  scenes: 'scenes',
  visuals: 'visuals',
  voice: 'voice',
  render: 'complete',
  export: 'complete',
}

export const TAB_TO_WORKFLOW_STEP: Partial<Record<QuickCutStageTab, WorkflowStepId>> = {
  title: 'angle',
  hook: 'hook',
  script: 'script',
  scenes: 'scenes',
  visuals: 'visuals',
  motion: 'visuals',
  voice: 'voice',
  render: 'render',
  complete: 'export',
  publish: 'export',
  repurpose: 'export',
}

export function workflowStepFromTab(tab: QuickCutStageTab): WorkflowStepId | null {
  return TAB_TO_WORKFLOW_STEP[tab] ?? null
}

export function workflowStepFromGenerationStep(step: QuickCutGenerationStep): WorkflowStepId {
  const tab = generationStepToTab(step)
  if (!tab) return 'analyze'
  return workflowStepFromTab(tab) ?? 'analyze'
}
