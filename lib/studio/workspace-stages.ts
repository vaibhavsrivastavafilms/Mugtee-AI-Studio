import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import {
  generationStepToTab,
  isStageTabDone,
  isStageTabReachable,
} from '@/lib/cinematic/quick-cut/stage-tabs'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

/** Command Center pipeline stages (vertical timeline + mobile tabs). */
export type WorkspaceStage =
  | 'idea'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'storyboard'
  | 'motion'
  | 'voice'
  | 'export'

export type WorkspaceStageStatus = 'completed' | 'active' | 'needs_attention' | 'upcoming'

export const WORKSPACE_STAGE_ORDER: WorkspaceStage[] = [
  'idea',
  'hook',
  'script',
  'scenes',
  'storyboard',
  'motion',
  'voice',
  'export',
]

export const WORKSPACE_STAGE_LABELS: Record<WorkspaceStage, string> = {
  idea: 'Idea',
  hook: 'Hook',
  script: 'Script',
  scenes: 'Scenes',
  storyboard: 'Storyboard',
  motion: 'Motion',
  voice: 'Voice',
  export: 'Export',
}

/** Mobile bottom tabs — subset of full pipeline. */
export const MOBILE_WORKSPACE_TABS: WorkspaceStage[] = [
  'script',
  'scenes',
  'storyboard',
  'voice',
  'export',
]

export const MOBILE_TAB_LABELS: Partial<Record<WorkspaceStage, string>> = {
  script: 'Story',
  scenes: 'Scenes',
  storyboard: 'Storyboard',
  voice: 'Voice',
  export: 'Export',
}

export function workspaceStageToTab(stage: WorkspaceStage): QuickCutStageTab {
  switch (stage) {
    case 'idea':
      return 'title'
    case 'hook':
      return 'hook'
    case 'script':
      return 'script'
    case 'scenes':
      return 'scenes'
    case 'storyboard':
      return 'visuals'
    case 'motion':
      return 'motion'
    case 'voice':
      return 'voice'
    case 'export':
      return 'complete'
  }
}

export function tabToWorkspaceStage(tab: QuickCutStageTab): WorkspaceStage | null {
  switch (tab) {
    case 'title':
      return 'idea'
    case 'hook':
      return 'hook'
    case 'script':
      return 'script'
    case 'scenes':
      return 'scenes'
    case 'visuals':
      return 'storyboard'
    case 'motion':
      return 'motion'
    case 'voice':
      return 'voice'
    case 'render':
      return 'export'
    case 'complete':
    case 'publish':
    case 'repurpose':
      return 'export'
    default:
      return null
  }
}

const FAILED_STEP_TO_STAGE: Record<string, WorkspaceStage> = {
  hook: 'hook',
  script: 'script',
  visual_direction: 'scenes',
  storyboard: 'storyboard',
  voice: 'voice',
  export: 'export',
}

export function inferActiveWorkspaceStage(input: {
  activeStage: WorkspaceStage
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  prompt: string
}): WorkspaceStage {
  if (input.isComplete) return 'export'
  if (input.generationStep === 'motion') return 'motion'
  const tab = generationStepToTab(input.generationStep)
  if (tab) {
    const fromStep = tabToWorkspaceStage(tab)
    if (fromStep) return fromStep
  }
  if (input.prompt.trim().length >= 6) return 'idea'
  return input.activeStage
}

export function getWorkspaceStageStatus(
  stage: WorkspaceStage,
  input: {
    activeStage: WorkspaceStage
    generationStep: QuickCutGenerationStep
    isComplete: boolean
    failedAtStep: string | null
    generationStatus: string
    prompt: string
  }
): WorkspaceStageStatus {
  const tab = workspaceStageToTab(stage)
  const failedStage = input.failedAtStep
    ? FAILED_STEP_TO_STAGE[input.failedAtStep] ?? null
    : null

  if (
    (input.generationStatus === 'failed' || input.generationStep === 'error') &&
    failedStage === stage
  ) {
    return 'needs_attention'
  }

  if (stage === input.activeStage) return 'active'

  if (stage === 'idea') {
    if (input.prompt.trim().length >= 6) return 'completed'
    return stage === input.activeStage ? 'active' : 'upcoming'
  }

  if (isStageTabDone(tab, input.generationStep, input.isComplete)) {
    return 'completed'
  }

  if (isStageTabReachable(tab, input.generationStep, input.isComplete)) {
    return stage === input.activeStage ? 'active' : 'upcoming'
  }

  return 'upcoming'
}
