import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { isStageTabReachable } from '@/lib/cinematic/quick-cut/stage-tabs'
import {
  MISSION_STEPS,
  resolveMissionStepState,
  type MissionStep,
} from '@/lib/mission/mission-steps'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import type { WorkflowStepId } from '@/lib/workflow/workflow-step-map'
import { WORKFLOW_STEP_TO_TAB } from '@/lib/workflow/workflow-step-map'

/** Stacked output sections shown in the creator workspace (post-audience/angle). */
export const STACKED_WORKFLOW_STEPS: {
  id: WorkflowStepId
  tab: QuickCutStageTab
  label: string
}[] = [
  { id: 'hook', tab: 'hook', label: 'Hook' },
  { id: 'script', tab: 'script', label: 'Script' },
  { id: 'scenes', tab: 'scenes', label: 'Scenes & Storyboard' },
  { id: 'voice', tab: 'voice', label: 'Voice' },
  { id: 'export', tab: 'complete', label: 'Export' },
]

export function missionStepIndex(stepId: WorkflowStepId): number {
  return MISSION_STEPS.findIndex((s) => s.id === stepId)
}

export function nextMissionStep(stepId: WorkflowStepId): MissionStep | null {
  const idx = missionStepIndex(stepId)
  if (idx < 0 || idx >= MISSION_STEPS.length - 1) return null
  return MISSION_STEPS[idx + 1] ?? null
}

export function inferCompletedWorkflowSteps(
  sectionStatus: SectionStatusMap,
  generationStep: QuickCutGenerationStep
): WorkflowStepId[] {
  return MISSION_STEPS.filter(
    (step) => resolveMissionStepState(step, sectionStatus, generationStep) === 'completed'
  ).map((s) => s.id as WorkflowStepId)
}

export function inferActiveWorkflowStep(
  sectionStatus: SectionStatusMap,
  generationStep: QuickCutGenerationStep,
  isComplete: boolean
): WorkflowStepId {
  if (isComplete) return 'export'

  const inProgress = MISSION_STEPS.find(
    (step) => resolveMissionStepState(step, sectionStatus, generationStep) === 'in_progress'
  )
  if (inProgress) return inProgress.id as WorkflowStepId

  const completed = inferCompletedWorkflowSteps(sectionStatus, generationStep)
  if (completed.length === 0) return 'analyze'

  const lastCompleted = completed[completed.length - 1]
  const next = nextMissionStep(lastCompleted)
  return (next?.id ?? lastCompleted) as WorkflowStepId
}

export type WorkflowContinuityInput = {
  sectionStatus: SectionStatusMap
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  hook: string
  script: string
  scenesCount: number
  voiceUrl: string | null
  exportPackageReady: boolean
  videoUrl: string | null
}

/** First incomplete stacked stage — drives "Continue Script →" CTAs. */
export function inferNextIncompleteStackedStep(
  input: WorkflowContinuityInput
): (typeof STACKED_WORKFLOW_STEPS)[number] | null {
  for (const step of STACKED_WORKFLOW_STEPS) {
    const missionStep = MISSION_STEPS.find((s) => s.id === step.id)
    if (!missionStep) continue
    const state = resolveMissionStepState(
      missionStep,
      input.sectionStatus,
      input.generationStep
    )
    if (state === 'completed') continue

    const tab = WORKFLOW_STEP_TO_TAB[step.id]
    const reachable = tab
      ? isStageTabReachable(tab, input.generationStep, input.isComplete)
      : false

    const hasContent =
      (step.id === 'hook' && Boolean(input.hook.trim())) ||
      (step.id === 'script' && Boolean(input.script.trim())) ||
      (step.id === 'scenes' &&
        (input.scenesCount > 0 || input.sectionStatus.storyboard !== 'idle')) ||
      (step.id === 'voice' && Boolean(input.voiceUrl?.trim())) ||
      (step.id === 'export' &&
        (input.exportPackageReady || Boolean(input.videoUrl?.trim())))

    if (state === 'in_progress' || reachable || hasContent) {
      return step
    }
  }
  return null
}

export function continueCtaLabel(step: (typeof STACKED_WORKFLOW_STEPS)[number]): string {
  return `Continue ${step.label} →`
}

export function isExportMissionComplete(input: WorkflowContinuityInput): boolean {
  if (!input.isComplete) return false
  const exportStep = MISSION_STEPS.find((s) => s.id === 'export')
  if (!exportStep) return false
  return (
    resolveMissionStepState(exportStep, input.sectionStatus, input.generationStep) ===
      'completed' || input.exportPackageReady || Boolean(input.videoUrl?.trim())
  )
}

export function isStackedSectionVisible(
  stepId: WorkflowStepId,
  input: WorkflowContinuityInput
): boolean {
  if (input.isComplete) return true

  const tab = WORKFLOW_STEP_TO_TAB[stepId]
  if (tab && isStageTabReachable(tab, input.generationStep, input.isComplete)) {
    return true
  }

  const missionStep = MISSION_STEPS.find((s) => s.id === stepId)
  if (!missionStep) return false

  const state = resolveMissionStepState(
    missionStep,
    input.sectionStatus,
    input.generationStep
  )
  if (state === 'completed' || state === 'in_progress') return true

  return (
    (stepId === 'hook' && Boolean(input.hook.trim())) ||
    (stepId === 'script' && Boolean(input.script.trim())) ||
    (stepId === 'scenes' &&
      (input.scenesCount > 0 || input.sectionStatus.storyboard !== 'idle')) ||
    (stepId === 'voice' && Boolean(input.voiceUrl?.trim()))
  )
}
