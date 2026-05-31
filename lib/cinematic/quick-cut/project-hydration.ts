import {
  ensureScenesHaveImagePrompts,
  parseCaptionsPayload,
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
  normalizeDirectorMode,
  extractDirectorModeFromCaptions,
  type DirectorMode,
} from '@/lib/cinematic/director-modes'
import {
  extractCreatorBlueprintFromCaptions,
  normalizeCreatorBlueprintId,
} from '@/lib/cinematic/creator-blueprints'
import {
  emptyVariationHistory,
  type VariationHistory,
} from '@/lib/cinematic/variation-history'
import type { ViralScript, VisualStyle } from '@/lib/cinematic/workflow-state'
import { resolveStoryBibleFromRow, type StoryBible } from '@/lib/cinematic/story-bible'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import {
  normalizeGenerationStatus,
  normalizePersistedStep,
  type GenerationStatus,
  type PersistedGenerationStep,
} from '@/lib/cinematic/generation-state'
import { SOFT_ERROR_COPY } from '@/lib/creator/soft-error-copy'
import { reelExportPollPath } from '@/lib/reels/export-paths'
import { extractContentSeriesFromCaptions } from '@/lib/cinematic/content-series'
import type { ContentSeries } from '@/lib/cinematic/content-series'
import {
  applySceneMotionToScenes,
  assignSceneMotion,
  parseSceneMotionMap,
} from '@/lib/motion/motion-presets'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import { resolveActiveThumbnailUrl } from '@/lib/cinematic/thumbnail-cover'

export function inferOpenStageTab(row: CinematicProjectRow): QuickCutStageTab {
  const scenes = resolveProjectScenes(row)
  const hasImages = scenes.some(
    (scene) => scene.imageUrl || scene.storyboardImages?.[0]?.url
  )
  if (row.reel_url || row.video_url) return 'complete'
  if (hasImages) return 'visuals'
  if (scenes.length > 0) return 'scenes'
  if (row.script_beats || row.script?.trim()) return 'script'
  const hook = rowToState(row).hook
  if (hook?.trim()) return 'hook'
  return 'scenes'
}

function inferGenerationStep(
  row: CinematicProjectRow,
  scenes: GeneratedScene[]
): QuickCutGenerationStep {
  if (row.reel_url || row.video_url) return 'complete'
  const hasImages = scenes.some((scene) => scene.imageUrl)
  if (hasImages) return 'voice'
  if (scenes.length > 0) return 'scenes'
  if (row.script_beats || row.script?.trim()) return 'script'
  return 'hook'
}

export type QuickCutProjectHydrationPatch = {
  savedProjectId: string
  studioReviewMode: true
  prompt: string
  title: string
  hook: string
  script: string
  scriptBeats: import('@/types/cinematic-script').ScriptBeat[]
  payoff: string
  cta: string
  scenes: GeneratedScene[]
  storyboard: GeneratedScene[]
  voiceUrl: string | null
  elevenLabsVoiceId: string | null
  voiceName: string | null
  videoUrl: string | null
  renderPollUrl: string | null
  renderError: string | null
  exportExpired: boolean
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  isGenerating: false
  activeStageTab: QuickCutStageTab
  stageTabPinned: true
  progress: number
  eta: 0
  error: string | null
  style: string
  duration: number
  niche: CinematicNiche
  language: ProjectLanguage
  directorMode: DirectorMode
  blueprintId: string | null
  visualStyle: VisualStyle | null
  storyBible: StoryBible | null
  viralScript: ViralScript | null
  variationHistory: VariationHistory
  virlo: VirloMetadata | null
  scriptArchetypeId: string | null
  scriptArchetypeLabel: string | null
  scriptArchetypeDisplay: string | null
  narrativeArchetype: string | null
  narrativeArchetypeLabel: string | null
  narrativeStructureLabels: string[] | null
  narrativeFlowDisplay: string | null
  contentAngleId: string | null
  contentAngleLabel: string | null
  hookFramework: string | null
  hookFrameworkLabel: string | null
  lastSavedAt: number
  originalTranscript: string
  lastGeneratedPrompt: string
  generationStatus: GenerationStatus
  lastCompletedStep: PersistedGenerationStep | null
  failedAtStep: PersistedGenerationStep | null
  repurposedAssets: import('@/lib/cinematic/content-repurpose').RepurposedAssetsMap
  contentSeries: ContentSeries | null
  sceneMotion: SceneMotionMap
  thumbnailImageUrl: string | null
}

export function buildQuickCutHydrationFromRow(
  row: CinematicProjectRow,
  stageTab?: QuickCutStageTab
): QuickCutProjectHydrationPatch {
  const state = rowToState(row)
  const parsedCaptions = parseCaptionsPayload(row.captions)
  const storyBible = resolveStoryBibleFromRow(row)
  let sceneMotion = parseSceneMotionMap(row.scene_motion)
  const baseScenes = ensureScenesHavePreviewUrls(
    ensureScenesHaveImagePrompts(storeScenesToGenerated(state.scenes))
  )
  if (Object.keys(sceneMotion).length < 1 && baseScenes.some((s) => s.imageUrl)) {
    sceneMotion = assignSceneMotion(baseScenes, storyBible, null)
  }
  const scenes = applySceneMotionToScenes(baseScenes, sceneMotion)
  const thumbnailImageUrl = resolveActiveThumbnailUrl(row.thumbnail_url, scenes)
  const resolvedTab = stageTab ?? inferOpenStageTab(row)

  const reelUrl = row.reel_url ?? row.video_url ?? null
  const videoReady = Boolean(reelUrl?.trim())
  const reelFailed = (row.reel_status ?? '').toLowerCase() === 'failed'
  const inProgressReel = ['pending', 'queued', 'assembling', 'rendering', 'uploading'].includes(
    (row.reel_status ?? '').toLowerCase()
  )
  const renderPollUrl =
    !videoReady && inProgressReel && row.reel_job_id?.trim()
      ? reelExportPollPath(row.reel_job_id.trim(), row.id)
      : null

  return {
    savedProjectId: row.id,
    studioReviewMode: true,
    prompt: state.prompt,
    title: state.title,
    hook: state.hook,
    script: state.script,
    scriptBeats: state.scriptBeats,
    payoff: state.payoff,
    cta: state.cta,
    scenes,
    storyboard: scenes,
    thumbnailImageUrl,
    voiceUrl: state.voice?.audioUrl ?? null,
    elevenLabsVoiceId: state.voice?.voiceId ?? null,
    voiceName: state.voice?.voiceName ?? null,
    videoUrl: reelUrl,
    renderPollUrl,
    exportExpired: reelFailed && !videoReady && !renderPollUrl,
    renderError: videoReady
      ? null
      : reelFailed
        ? 'Export expired. Regenerate export.'
        : null,
    generationStep:
      row.generation_status === 'failed'
        ? ('error' as QuickCutGenerationStep)
        : videoReady
          ? 'complete'
          : inferGenerationStep(row, scenes),
    isComplete: Boolean(
      row.reel_url ||
        row.video_url ||
        (scenes.length > 0 && (state.scriptBeats.length > 0 || state.script.trim()))
    ),
    isGenerating: false,
    activeStageTab: resolvedTab,
    stageTabPinned: true,
    progress: videoReady ? 100 : reelFailed ? 88 : 100,
    eta: 0,
    error:
      row.generation_status === 'failed'
        ? row.generation_error?.trim() || SOFT_ERROR_COPY.storyPaused
        : null,
    style: state.style,
    duration: state.duration,
    niche: (state.niche as CinematicNiche) || 'storytelling',
    language: (row.language as ProjectLanguage) || 'en',
    directorMode: normalizeDirectorMode(
      extractDirectorModeFromCaptions(row.captions)
    ),
    scriptArchetypeId: parsedCaptions.narrativeArchetype ?? parsedCaptions.archetypeId ?? null,
    scriptArchetypeLabel:
      parsedCaptions.narrativeArchetypeLabel ?? parsedCaptions.archetypeLabel ?? null,
    scriptArchetypeDisplay: parsedCaptions.archetypeDisplay ?? null,
    narrativeArchetype: parsedCaptions.narrativeArchetype ?? parsedCaptions.archetypeId ?? null,
    narrativeArchetypeLabel:
      parsedCaptions.narrativeArchetypeLabel ?? parsedCaptions.archetypeLabel ?? null,
    narrativeStructureLabels: parsedCaptions.narrativeStructureLabels ?? null,
    narrativeFlowDisplay: parsedCaptions.narrativeFlowDisplay ?? null,
    contentAngleId: parsedCaptions.contentAngleId ?? null,
    contentAngleLabel: parsedCaptions.contentAngleLabel ?? null,
    hookFramework: parsedCaptions.hookFramework ?? null,
    hookFrameworkLabel: parsedCaptions.hookFrameworkLabel ?? null,
    blueprintId: normalizeCreatorBlueprintId(
      extractCreatorBlueprintFromCaptions(row.captions)
    ),
    visualStyle: (row.visual_style as VisualStyle | null) ?? null,
    storyBible,
    sceneMotion,
    viralScript: (row.viral_script as ViralScript | null) ?? null,
    variationHistory:
      (row.variation_history as VariationHistory | null) ?? emptyVariationHistory(),
    virlo: (row.virlo as VirloMetadata | null) ?? null,
    lastSavedAt: new Date(row.updated_at).getTime(),
    originalTranscript: row.original_transcript?.trim() || state.prompt || '',
    lastGeneratedPrompt: state.prompt?.trim() || '',
    generationStatus:
      normalizeGenerationStatus(row.generation_status) ??
      (row.generation_error ? 'failed' : 'completed'),
    lastCompletedStep: normalizePersistedStep(row.last_completed_step),
    failedAtStep:
      row.generation_status === 'failed'
        ? normalizePersistedStep(row.generation_step)
        : null,
    repurposedAssets: parsedCaptions.repurposedAssets ?? {},
    contentSeries:
      parsedCaptions.series ?? extractContentSeriesFromCaptions(row.captions),
  }
}
