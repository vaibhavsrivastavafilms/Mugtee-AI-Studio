import {
  ensureScenesHaveImagePrompts,
  storeScenesToGenerated,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import { ensureScenesHavePreviewUrls } from '@/lib/cinematic/scene-preview-url'
import {
  rowToState,
  resolveProjectScenes,
  type CinematicProjectRow,
} from '@/lib/cinematic-projects'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  emptyVariationHistory,
  type VariationHistory,
} from '@/lib/cinematic/variation-history'
import type { ViralScript, VisualStyle } from '@/lib/cinematic/workflow-state'
import type { VirloMetadata } from '@/lib/virlo-engine/types'

export function inferOpenStageTab(row: CinematicProjectRow): QuickCutStageTab {
  const scenes = resolveProjectScenes(row)
  const hasImages = scenes.some(
    (scene) => scene.imageUrl || scene.storyboardImages?.[0]?.url
  )
  if (row.video_url) return 'complete'
  if (hasImages) return 'visuals'
  if (scenes.length > 0) return 'scenes'
  if (row.script?.trim()) return 'script'
  const hook = rowToState(row).hook
  if (hook?.trim()) return 'hook'
  return 'scenes'
}

function inferGenerationStep(
  row: CinematicProjectRow,
  scenes: GeneratedScene[]
): QuickCutGenerationStep {
  if (row.video_url) return 'complete'
  const hasImages = scenes.some((scene) => scene.imageUrl)
  if (hasImages) return 'voice'
  if (scenes.length > 0) return 'scenes'
  if (row.script?.trim()) return 'script'
  return 'hook'
}

export type QuickCutProjectHydrationPatch = {
  savedProjectId: string
  studioReviewMode: true
  prompt: string
  title: string
  hook: string
  script: string
  scenes: GeneratedScene[]
  storyboard: GeneratedScene[]
  voiceUrl: string | null
  videoUrl: string | null
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  isGenerating: false
  activeStageTab: QuickCutStageTab
  stageTabPinned: true
  progress: number
  eta: 0
  error: null
  style: string
  duration: number
  niche: CinematicNiche
  language: ProjectLanguage
  visualStyle: VisualStyle | null
  viralScript: ViralScript | null
  variationHistory: VariationHistory
  virlo: VirloMetadata | null
  lastSavedAt: number
  originalTranscript: string
}

export function buildQuickCutHydrationFromRow(
  row: CinematicProjectRow,
  stageTab?: QuickCutStageTab
): QuickCutProjectHydrationPatch {
  const state = rowToState(row)
  const scenes = ensureScenesHavePreviewUrls(
    ensureScenesHaveImagePrompts(storeScenesToGenerated(state.scenes))
  )
  const resolvedTab = stageTab ?? inferOpenStageTab(row)
  const generationStep = inferGenerationStep(row, scenes)
  const isComplete = generationStep === 'complete' || scenes.length > 0

  return {
    savedProjectId: row.id,
    studioReviewMode: true,
    prompt: state.prompt,
    title: state.title,
    hook: state.hook,
    script: state.script,
    scenes,
    storyboard: scenes,
    voiceUrl: state.voice?.audioUrl ?? null,
    videoUrl: row.video_url ?? null,
    generationStep: isComplete && row.video_url ? 'complete' : generationStep,
    isComplete: Boolean(row.video_url || (scenes.length > 0 && state.script.trim())),
    isGenerating: false,
    activeStageTab: resolvedTab,
    stageTabPinned: true,
    progress: 100,
    eta: 0,
    error: null,
    style: state.style,
    duration: state.duration,
    niche: (state.niche as CinematicNiche) || 'storytelling',
    language: (row.language as ProjectLanguage) || 'en',
    visualStyle: (row.visual_style as VisualStyle | null) ?? null,
    viralScript: (row.viral_script as ViralScript | null) ?? null,
    variationHistory:
      (row.variation_history as VariationHistory | null) ?? emptyVariationHistory(),
    virlo: (row.virlo as VirloMetadata | null) ?? null,
    lastSavedAt: new Date(row.updated_at).getTime(),
    originalTranscript: row.original_transcript?.trim() || state.prompt || '',
  }
}
