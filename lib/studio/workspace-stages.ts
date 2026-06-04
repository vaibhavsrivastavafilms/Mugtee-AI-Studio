import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import type { SectionId, SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

/** Command Center pipeline stages (vertical timeline + mobile tabs). */
export type WorkspaceStage =
  | 'idea'
  | 'research'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'storyboard'
  | 'motion'
  | 'voice'
  | 'export'

export type WorkspaceStageStatus = 'completed' | 'active' | 'needs_attention' | 'upcoming'

/** Internal pipeline state — single source of truth for stage resolution. */
export type WorkspacePipelineState = 'pending' | 'in_progress' | 'done' | 'failed'

export const WORKSPACE_STAGE_ORDER: WorkspaceStage[] = [
  'idea',
  'research',
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
  research: 'Research',
  hook: 'Hook',
  script: 'Script',
  scenes: 'Scenes',
  storyboard: 'Storyboard',
  motion: 'Motion',
  voice: 'Voice',
  export: 'Export',
}

/** Maps each pipeline stage to its sectionStatus key (when applicable). */
export const WORKSPACE_STAGE_SECTION: Partial<Record<WorkspaceStage, SectionId>> = {
  idea: 'contentDirectorBrief',
  hook: 'hook',
  script: 'script',
  scenes: 'visualDirection',
  storyboard: 'storyboard',
  voice: 'voice',
  export: 'export',
}

/** Generation steps that indicate a stage is actively running. */
export const WORKSPACE_STAGE_GENERATION_STEPS: Record<WorkspaceStage, QuickCutGenerationStep[]> = {
  idea: ['analyzing', 'title'],
  research: ['analyzing', 'script'],
  hook: ['hook'],
  script: ['script'],
  scenes: ['scenes'],
  storyboard: ['images'],
  motion: ['motion'],
  voice: ['voice'],
  export: ['render'],
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
    case 'research':
      return 'script'
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

export type WorkspacePipelineInput = {
  sectionStatus: SectionStatusMap
  generationStep: QuickCutGenerationStep
  isGenerating: boolean
  isRenderingVideo: boolean
  isComplete: boolean
  failedAtStep: string | null
  generationStatus: string
  prompt: string
  videoUrl: string | null
  exportPackageReady: boolean
  videoRenderEnabled: boolean
  exportExpired: boolean
}

function stageIndex(stage: WorkspaceStage): number {
  return WORKSPACE_STAGE_ORDER.indexOf(stage)
}

function activeGenerationStageIndex(input: WorkspacePipelineInput): number {
  if (input.isRenderingVideo || input.generationStep === 'render') {
    return stageIndex('export')
  }
  const fromStep = tabToWorkspaceStage(generationStepToTab(input.generationStep) ?? 'title')
  if (fromStep) return stageIndex(fromStep)
  if (input.generationStep === 'analyzing') return stageIndex('idea')
  return -1
}

function isExportDone(input: WorkspacePipelineInput): boolean {
  if (input.sectionStatus.export === 'completed') return true
  if (input.exportExpired) return false
  if (input.videoRenderEnabled) return Boolean(input.videoUrl?.trim())
  return input.exportPackageReady
}

function resolveExportPipelineState(input: WorkspacePipelineInput): WorkspacePipelineState {
  if (isExportDone(input)) return 'done'
  if (input.sectionStatus.export === 'failed' || input.exportExpired) return 'failed'
  if (
    input.isRenderingVideo ||
    (input.sectionStatus.export === 'generating' &&
      (input.isGenerating || input.generationStep === 'render'))
  ) {
    return 'in_progress'
  }
  return 'pending'
}

function resolveMotionPipelineState(input: WorkspacePipelineInput): WorkspacePipelineState {
  if (input.isComplete || input.sectionStatus.voice !== 'idle') return 'done'
  if (input.generationStep === 'motion' && input.isGenerating) return 'in_progress'
  if (input.sectionStatus.storyboard === 'completed') {
    const activeIdx = activeGenerationStageIndex(input)
    if (activeIdx > stageIndex('motion')) return 'done'
  }
  return 'pending'
}

function resolveIdeaPipelineState(input: WorkspacePipelineInput): WorkspacePipelineState {
  const brief = input.sectionStatus.contentDirectorBrief
  if (brief === 'completed') return 'done'
  if (brief === 'failed') return 'failed'
  if (brief === 'generating') return 'in_progress'
  if (
    input.isGenerating &&
    WORKSPACE_STAGE_GENERATION_STEPS.idea.includes(input.generationStep)
  ) {
    return 'in_progress'
  }
  if (input.prompt.trim().length >= 6 && input.isComplete) return 'done'
  return 'pending'
}

/** Resolve live pipeline state for a workspace stage from generation store fields. */
export function resolveWorkspacePipelineState(
  stage: WorkspaceStage,
  input: WorkspacePipelineInput
): WorkspacePipelineState {
  const failedStage = input.failedAtStep
    ? FAILED_STEP_TO_STAGE[input.failedAtStep] ?? null
    : null

  if (
    (input.generationStatus === 'failed' || input.generationStep === 'error') &&
    failedStage === stage
  ) {
    return 'failed'
  }

  if (stage === 'export') return resolveExportPipelineState(input)
  if (stage === 'motion') return resolveMotionPipelineState(input)
  if (stage === 'idea') return resolveIdeaPipelineState(input)
  if (stage === 'research') {
    if (input.sectionStatus.contentDirectorBrief === 'completed' && input.prompt.trim().length >= 6) {
      return 'done'
    }
    if (input.isGenerating && input.generationStep === 'analyzing') return 'in_progress'
    return 'pending'
  }

  const section = WORKSPACE_STAGE_SECTION[stage]
  if (section) {
    const status = input.sectionStatus[section]
    if (status === 'completed') return 'done'
    if (status === 'failed') return 'failed'
    if (status === 'generating') return 'in_progress'
  }

  if (
    input.isGenerating &&
    WORKSPACE_STAGE_GENERATION_STEPS[stage].includes(input.generationStep)
  ) {
    return 'in_progress'
  }

  const stageIdx = stageIndex(stage)
  const activeIdx = activeGenerationStageIndex(input)
  if (activeIdx > stageIdx) return 'done'

  return 'pending'
}

export function pipelineStateToWorkspaceStatus(
  state: WorkspacePipelineState
): WorkspaceStageStatus {
  switch (state) {
    case 'done':
      return 'completed'
    case 'in_progress':
      return 'active'
    case 'failed':
      return 'needs_attention'
    case 'pending':
    default:
      return 'upcoming'
  }
}

export function inferActiveWorkspaceStage(input: {
  activeStage: WorkspaceStage
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  prompt: string
  isGenerating?: boolean
  isRenderingVideo?: boolean
}): WorkspaceStage {
  if (input.isRenderingVideo || input.generationStep === 'render') return 'export'
  if (input.isGenerating) {
    if (input.generationStep === 'motion') return 'motion'
    const tab = generationStepToTab(input.generationStep)
    if (tab) {
      const fromStep = tabToWorkspaceStage(tab)
      if (fromStep) return fromStep
    }
  }
  if (input.prompt.trim().length >= 6 && !input.isComplete) return 'idea'
  return input.activeStage
}

export function getWorkspaceStageStatus(
  stage: WorkspaceStage,
  input: WorkspacePipelineInput
): WorkspaceStageStatus {
  return pipelineStateToWorkspaceStatus(resolveWorkspacePipelineState(stage, input))
}
