import type { SectionId, SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import type {
  CinematicGenerationProgressInput,
  CinematicGenerationProgressSnapshot,
  ProgressStageStatus,
} from '@/lib/quick-cut/cinematic-generation-progress'
import { resolveCinematicGenerationProgress } from '@/lib/quick-cut/cinematic-generation-progress'

const EXPORT_FPS = 30

export type HudStatusItem = {
  id: string
  label: string
  status: ProgressStageStatus
  display: string
}

const HUD_STAGES: Array<{
  id: string
  label: string
  section: SectionId | null
  generationSteps: QuickCutGenerationStep[]
}> = [
  { id: 'hook', label: 'Hook', section: 'hook', generationSteps: ['analyzing', 'title', 'hook'] },
  { id: 'script', label: 'Script', section: 'script', generationSteps: ['script'] },
  { id: 'scenes', label: 'Scenes', section: 'visualDirection', generationSteps: ['scenes'] },
  { id: 'storyboard', label: 'Storyboard', section: 'storyboard', generationSteps: ['images'] },
  { id: 'voice', label: 'Voice', section: 'voice', generationSteps: ['voice'] },
  { id: 'motion', label: 'Motion', section: null, generationSteps: ['motion'] },
  { id: 'export', label: 'Export', section: 'export', generationSteps: ['render'] },
]

function hudStageStatus(
  stage: (typeof HUD_STAGES)[number],
  input: CinematicGenerationProgressInput,
  snapshot: CinematicGenerationProgressSnapshot
): ProgressStageStatus {
  const fromSnapshot = snapshot.stages.find((s) => {
    if (stage.id === 'hook') return s.id === 'hook'
    if (stage.id === 'script') return s.id === 'script'
    if (stage.id === 'scenes') return s.id === 'scenes'
    if (stage.id === 'storyboard') return s.id === 'storyboard'
    if (stage.id === 'voice') return s.id === 'voiceover'
    if (stage.id === 'motion') return s.id === 'motion'
    if (stage.id === 'export') {
      return s.id === 'export_package' || s.id === 'rendering_mp4' || s.id === 'uploading_assets'
    }
    return false
  })

  if (fromSnapshot) {
    if (stage.id === 'export') {
      if (input.videoUrl || input.exportPackageReady) return 'completed'
      if (input.isRenderingVideo || input.renderPollUrl) return 'current'
      if (fromSnapshot.status === 'completed') return 'completed'
      if (fromSnapshot.status === 'current') return 'current'
    }
    return fromSnapshot.status
  }

  if (stage.section && input.sectionStatus[stage.section] === 'completed') return 'completed'
  if (stage.section && input.sectionStatus[stage.section] === 'generating') return 'current'
  if (stage.generationSteps.includes(input.generationStep)) return 'current'
  if (stage.id === 'hook' && input.hook.trim()) return 'completed'
  if (stage.id === 'script' && input.script.trim()) return 'completed'
  if (stage.id === 'scenes' && input.scenesCount > 0) return 'completed'
  if (stage.id === 'voice' && input.voiceUrl?.trim()) return 'completed'
  return 'pending'
}

function hudDisplayLabel(label: string, status: ProgressStageStatus): string {
  if (status === 'completed') return `${label} Complete`
  if (status === 'current') return `${label} Generating`
  if (status === 'failed') return `${label} Failed`
  return `${label} Pending`
}

export function resolveHudStatusList(
  input: CinematicGenerationProgressInput,
  snapshot: CinematicGenerationProgressSnapshot
): HudStatusItem[] {
  return HUD_STAGES.map((stage) => {
    const status = hudStageStatus(stage, input, snapshot)
    return {
      id: stage.id,
      label: stage.label,
      status,
      display: hudDisplayLabel(stage.label, status),
    }
  })
}

export type StoryboardSceneProgress = {
  isActive: boolean
  completedCount: number
  totalCount: number
  currentSceneIndex: number
  currentSceneLabel: string | null
}

export function resolveStoryboardSceneProgress(input: {
  generationStep: QuickCutGenerationStep
  sectionStatus: SectionStatusMap
  scenes: GeneratedScene[]
  directingSceneLabel: string | null
}): StoryboardSceneProgress | null {
  const isActive =
    input.generationStep === 'images' ||
    input.sectionStatus.storyboard === 'generating'

  if (!isActive && input.sectionStatus.storyboard !== 'completed') {
    return null
  }

  const totalCount = Math.max(input.scenes.length, 1)
  const completedCount = input.scenes.filter((s) => s.imageUrl?.trim()).length
  const currentSceneIndex = Math.min(completedCount + (isActive ? 1 : 0), totalCount)

  let currentSceneLabel: string | null = null
  if (isActive) {
    if (input.directingSceneLabel) {
      currentSceneLabel = input.directingSceneLabel
    } else if (completedCount < totalCount) {
      currentSceneLabel = `Scene ${currentSceneIndex} of ${totalCount}`
    } else {
      currentSceneLabel = 'Generating Storyboard Images…'
    }
  }

  return {
    isActive,
    completedCount,
    totalCount,
    currentSceneIndex,
    currentSceneLabel,
  }
}

export type ExportFrameProgress = {
  isActive: boolean
  progressPercent: number
  currentFrame: number
  totalFrames: number
  label: string
}

export function resolveExportFrameProgress(input: {
  isRenderingVideo: boolean
  renderPollUrl: string | null
  videoUrl: string | null
  progress: number
  renderStatusLabel: string | null
  totalDurationSec: number
}): ExportFrameProgress | null {
  const isActive = Boolean(
    input.isRenderingVideo || (input.renderPollUrl && !input.videoUrl)
  )

  if (!isActive) return null

  const totalFrames = Math.max(1, Math.round(input.totalDurationSec * EXPORT_FPS))
  const progressPercent = Math.max(
    0,
    Math.min(99, Math.round(input.progress))
  )
  const currentFrame = Math.max(
    0,
    Math.min(totalFrames, Math.round((progressPercent / 100) * totalFrames))
  )

  return {
    isActive: true,
    progressPercent,
    currentFrame,
    totalFrames,
    label: input.renderStatusLabel?.trim() || 'Rendering MP4…',
  }
}

/** Re-export for HUD consumers. */
export { resolveCinematicGenerationProgress }
