import type { SectionId, SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { STEP_LABELS } from '@/stores/quick-cut-generation-store'

export type ProgressStageStatus = 'completed' | 'current' | 'pending' | 'failed'

export type CinematicProgressStageId =
  | 'hook'
  | 'script'
  | 'scenes'
  | 'storyboard'
  | 'voiceover'
  | 'captions'
  | 'motion'
  | 'export_package'
  | 'rendering_mp4'
  | 'uploading_assets'
  | 'publishing'

type StageDefinition = {
  id: CinematicProgressStageId
  label: string
  activeLabel: string
  section: SectionId | null
  generationSteps: QuickCutGenerationStep[]
  group: 'core' | 'export'
  isActive?: (input: CinematicGenerationProgressInput) => boolean
}

export type CinematicGenerationProgressInput = {
  generationStep: QuickCutGenerationStep
  sectionStatus: SectionStatusMap
  isGenerating: boolean
  isComplete: boolean
  isRenderingVideo: boolean
  videoRenderEnabled: boolean
  renderPollUrl: string | null
  videoUrl: string | null
  renderStatusLabel: string | null
  hook: string
  script: string
  scenesCount: number
  voiceUrl: string | null
  exportPackageReady: boolean
  directingSceneLabel: string | null
  hookProgressLabel: string | null
  progress: number
}

export type CinematicGenerationProgressSnapshot = {
  percent: number
  headline: string
  currentStepLabel: string | null
  stages: Array<{
    id: CinematicProgressStageId
    label: string
    status: ProgressStageStatus
    group: 'core' | 'export'
  }>
  completedLabels: string[]
  remainingLabels: string[]
  isReady: boolean
}

const CORE_STAGES: StageDefinition[] = [
  {
    id: 'hook',
    label: 'Hook',
    activeLabel: 'Crafting Hook…',
    section: 'hook',
    generationSteps: ['analyzing', 'title', 'hook'],
    group: 'core',
  },
  {
    id: 'script',
    label: 'Script',
    activeLabel: 'Writing Script…',
    section: 'script',
    generationSteps: ['script'],
    group: 'core',
  },
  {
    id: 'scenes',
    label: 'Scenes',
    activeLabel: 'Building Scene Breakdown…',
    section: 'visualDirection',
    generationSteps: ['scenes'],
    group: 'core',
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    activeLabel: 'Generating Storyboard Images…',
    section: 'storyboard',
    generationSteps: ['images'],
    group: 'core',
  },
  {
    id: 'voiceover',
    label: 'Voiceover',
    activeLabel: 'Creating Voiceover…',
    section: 'voice',
    generationSteps: ['voice'],
    group: 'core',
  },
  {
    id: 'captions',
    label: 'Captions',
    activeLabel: 'Generating Captions…',
    section: 'captions',
    generationSteps: [],
    group: 'core',
  },
  {
    id: 'motion',
    label: 'Motion Plan',
    activeLabel: 'Applying Motion Plan…',
    section: null,
    generationSteps: ['motion'],
    group: 'core',
  },
  {
    id: 'export_package',
    label: 'Export Package',
    activeLabel: 'Preparing Export Package…',
    section: 'export',
    generationSteps: ['render'],
    group: 'core',
  },
]

const EXPORT_STAGES: StageDefinition[] = [
  {
    id: 'rendering_mp4',
    label: 'Rendering MP4',
    activeLabel: 'Rendering MP4…',
    section: null,
    generationSteps: ['render'],
    group: 'export',
    isActive: (input) =>
      Boolean(
        input.videoRenderEnabled &&
          (input.isRenderingVideo ||
            (input.renderPollUrl &&
              !input.videoUrl &&
              !/upload/i.test(input.renderStatusLabel ?? '')))
      ),
  },
  {
    id: 'uploading_assets',
    label: 'Uploading Assets',
    activeLabel: 'Uploading Assets…',
    section: null,
    generationSteps: ['render'],
    group: 'export',
    isActive: (input) =>
      Boolean(
        input.videoRenderEnabled &&
          input.renderPollUrl &&
          !input.videoUrl &&
          /upload/i.test(input.renderStatusLabel ?? '')
      ),
  },
  {
    id: 'publishing',
    label: 'Publishing',
    activeLabel: 'Publishing…',
    section: null,
    generationSteps: [],
    group: 'export',
    isActive: () => false,
  },
]

function sectionStatusToStage(
  section: SectionId | null,
  sectionStatus: SectionStatusMap
): ProgressStageStatus | null {
  if (!section) return null
  const status = sectionStatus[section]
  if (status === 'completed') return 'completed'
  if (status === 'generating') return 'current'
  if (status === 'failed') return 'failed'
  return 'pending'
}

function resolveStageStatus(
  stage: StageDefinition,
  input: CinematicGenerationProgressInput,
  activeStepIndex: number,
  stageIndex: number
): ProgressStageStatus {
  const fromSection = sectionStatusToStage(stage.section, input.sectionStatus)
  if (fromSection === 'completed') return 'completed'
  if (fromSection === 'current') return 'current'
  if (fromSection === 'failed') return 'failed'

  if (stage.generationSteps.includes(input.generationStep)) return 'current'

  if (input.isComplete && stage.group === 'core') {
    if (stage.id === 'export_package') {
      return input.exportPackageReady || input.videoUrl ? 'completed' : 'pending'
    }
    return 'completed'
  }

  if (activeStepIndex >= 0 && stageIndex < activeStepIndex) return 'completed'
  if (activeStepIndex >= 0 && stageIndex > activeStepIndex) return 'pending'

  if (stage.id === 'hook' && input.hook.trim()) return 'completed'
  if (stage.id === 'script' && input.script.trim()) return 'completed'
  if (stage.id === 'scenes' && input.scenesCount > 0) return 'completed'
  if (stage.id === 'voiceover' && input.voiceUrl?.trim()) return 'completed'

  return 'pending'
}

function resolveActiveStepIndex(stages: StageDefinition[], input: CinematicGenerationProgressInput): number {
  const byGeneration = stages.findIndex((s) => s.generationSteps.includes(input.generationStep))
  if (byGeneration >= 0) return byGeneration

  const bySection = stages.findIndex(
    (s) => s.section && input.sectionStatus[s.section] === 'generating'
  )
  if (bySection >= 0) return bySection

  return stages.findIndex((s) => resolveStageStatus(s, input, -1, 0) === 'current')
}

function resolveCurrentStepLabel(
  stages: Array<{ id: CinematicProgressStageId; label: string; status: ProgressStageStatus }>,
  definitions: StageDefinition[],
  input: CinematicGenerationProgressInput
): string | null {
  const current = stages.find((s) => s.status === 'current')
  if (current) {
    const def = definitions.find((d) => d.id === current.id)
    if (def) {
      if (current.id === 'scenes' && input.directingSceneLabel) {
        return input.directingSceneLabel
      }
      if (current.id === 'hook' && input.hookProgressLabel) {
        return input.hookProgressLabel
      }
      if (current.id === 'rendering_mp4' && input.renderStatusLabel) {
        return input.renderStatusLabel
      }
      return def.activeLabel
    }
  }

  if (input.generationStep !== 'idle' && input.generationStep !== 'complete' && input.generationStep !== 'error') {
    const fromStore = STEP_LABELS[input.generationStep]
    if (fromStore) return fromStore
  }

  return null
}

function shouldIncludeExportStages(input: CinematicGenerationProgressInput): boolean {
  if (!input.videoRenderEnabled) return false
  return Boolean(
    input.isRenderingVideo ||
      input.renderPollUrl ||
      (input.generationStep === 'render' && (input.isGenerating || input.isComplete))
  )
}

export function resolveCinematicGenerationProgress(
  input: CinematicGenerationProgressInput
): CinematicGenerationProgressSnapshot {
  const exportStagesActive = shouldIncludeExportStages(input)
  const allDefinitions = exportStagesActive ? [...CORE_STAGES, ...EXPORT_STAGES] : CORE_STAGES

  const activeIndex = resolveActiveStepIndex(allDefinitions, input)

  const stages = allDefinitions.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    status: resolveStageStatus(stage, input, activeIndex, index),
    group: stage.group,
  }))

  if (exportStagesActive) {
    const exportPackage = stages.find((s) => s.id === 'export_package')
    const renderingMp4 = stages.find((s) => s.id === 'rendering_mp4')
    const uploadingAssets = stages.find((s) => s.id === 'uploading_assets')
    const publishing = stages.find((s) => s.id === 'publishing')

    if (exportPackage && (input.isRenderingVideo || input.renderPollUrl || input.videoUrl)) {
      exportPackage.status = 'completed'
    }

    if (renderingMp4) {
      if (input.videoUrl) renderingMp4.status = 'completed'
      else if (EXPORT_STAGES[0].isActive?.(input)) renderingMp4.status = 'current'
      else renderingMp4.status = 'pending'
    }

    if (uploadingAssets) {
      if (input.videoUrl) uploadingAssets.status = 'completed'
      else if (EXPORT_STAGES[1].isActive?.(input)) uploadingAssets.status = 'current'
      else uploadingAssets.status = 'pending'
    }

    if (publishing && publishing.status !== 'current') {
      publishing.status = 'pending'
    }
  }

  const exportInFlight =
    input.isRenderingVideo ||
    Boolean(input.renderPollUrl && !input.videoUrl && input.videoRenderEnabled)

  const isReady =
    input.isComplete &&
    !input.isGenerating &&
    !exportInFlight &&
    input.generationStep !== 'error'

  let percent = 0
  if (isReady) {
    percent = 100
  } else {
    const completed = stages.filter((s) => s.status === 'completed').length
    const hasCurrent = stages.some((s) => s.status === 'current')
    const exportProgress =
      exportInFlight && input.progress > 0 && input.progress < 100
        ? (input.progress / 100) * (1 / Math.max(stages.length, 1))
        : 0
    percent = Math.round(
      ((completed + (hasCurrent ? 0.45 : 0) + exportProgress) / stages.length) * 100
    )
    percent = Math.min(99, Math.max(0, percent))
  }

  const completedLabels = stages.filter((s) => s.status === 'completed').map((s) => s.label)
  const remainingLabels = stages
    .filter((s) => s.status === 'pending' || s.status === 'failed')
    .map((s) => s.label)

  const headline = isReady ? '✓ Your Reel Is Ready' : 'Building your reel…'
  const currentStepLabel = isReady ? null : resolveCurrentStepLabel(stages, allDefinitions, input)

  return {
    percent: isReady ? 100 : percent,
    headline,
    currentStepLabel,
    stages,
    completedLabels,
    remainingLabels,
    isReady,
  }
}
