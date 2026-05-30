'use client'

import { create } from 'zustand'
import { coerceDuration } from '@/lib/workspace/validation'
import {
  ensureScenesHaveImagePrompts,
  extractCharacterDescription,
  scenesWithCharacterImagePrompts,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import { isHookTooSimilar } from '@/lib/cinematic/hook-variation'
import { type ProjectLanguage } from '@/lib/cinematic/language-detection'
import { loadContentLanguagePreference } from '@/lib/cinematic/content-languages'
import type { ViralScript, VisualStyle } from '@/lib/cinematic/workflow-state'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import { applyGenerationToStore } from '@/stores/cinematic-project'
import {
  clearQuickCutPreview,
  saveQuickCutPreview,
} from '@/lib/cinematic/quick-cut/preview-session'
import { quickCutTopicChanged } from '@/lib/cinematic/quick-cut/prompt-key'
import type { ScriptBeat } from '@/types/cinematic-script'
import {
  scenesToStore,
  type CinematicGenerationOutput,
} from '@/lib/cinematic/generation'
import {
  archiveGeneratedProject,
  CinematicProjectsUnavailableError,
  CINEMATIC_PROJECTS_MIGRATION_HINT,
  isCinematicProjectsUnavailable,
  updateProject,
  type ArchiveGeneratedProjectInput,
} from '@/lib/cinematic-projects'
import {
  completedStatus,
  editingStatus,
  exportedStatus,
  reviewingStatus,
} from '@/lib/cinematic/project-status'
import {
  appendHookVersion,
  appendStoryboardVersion,
  emptyVariationHistory,
  selectHookVersion as applyHookVersionSelection,
  selectStoryboardVersion as applyStoryboardVersionSelection,
  type VariationHistory,
} from '@/lib/cinematic/variation-history'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { simulateMockExport } from '@/lib/cinematic/quick-cut/mock-export.client'
import { friendlyReelRenderError } from '@/lib/video/reel-render-errors'
import type { QuickCutPipelineStatus } from '@/lib/cinematic/quick-cut/pipeline-status'
import { buildEmotionalPreviewRhythm, mergePreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
import {
  clearHookSession,
  loadHookSession,
  saveHookSession,
} from '@/lib/cinematic/quick-cut/hook-session'
import { regenerateHook as requestHookRegen } from '@/lib/cinematic/refinement-client'
import {
  generationStepToTab,
  type QuickCutStageTab,
} from '@/lib/cinematic/quick-cut/stage-tabs'
import { buildQuickCutHydrationFromRow } from '@/lib/cinematic/quick-cut/project-hydration'
import { loadProject } from '@/lib/cinematic-projects'
import { inferProjectMode } from '@/lib/cinematic/project-mode'
import {
  streakRecordExportCompleted,
  streakRecordWorkflowCreated,
} from '@/lib/creator/creator-streak-events'
import {
  getCreatorMemoryBiasHints,
  rememberCreativeSession,
} from '@/lib/creator/creator-memory'
import { pickRecommendedVoice, voiceStyleToElevenCategory } from '@/lib/ai/elevenlabs'
import type { ElevenLabsVoiceOption } from '@/lib/ai/elevenlabs'
import { recommendVoiceStyle } from '@/lib/cinematic/voice-match'
import type { DeepResearchStoreFields } from '@/types/deep-research'
import {
  EMPTY_STORYBOARD_FIELDS,
  type StoryboardScene,
  type StoryboardStoreFields,
} from '@/types/storyboard'
import {
  inferLastCompletedStep,
  PERSISTED_STEP_ORDER,
  stepShouldRun,
  type GenerationStatus,
  type PersistedGenerationStep,
} from '@/lib/cinematic/generation-state'
import {
  logGenerationRecoverable,
  logGenerationResumed,
  logGenerationStart,
  logStepFailed,
} from '@/lib/cinematic/generation-logger'
import {
  pipelineFetch,
  pipelineFetchJson,
  DEEP_RESEARCH_TIMEOUT_MS,
  SCRIPT_GENERATION_TIMEOUT_MS,
} from '@/lib/cinematic/generation-pipeline-fetch'
import { toUserGenerationError } from '@/lib/cinematic/generation-errors'
import {
  persistGenerationFailed,
  persistStepComplete,
} from '@/lib/cinematic/generation-persist'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import {
  deriveScriptText,
  narrationFromCinematicScript,
  resolveCinematicScript,
} from '@/lib/cinematic/cinematic-script'
import type { CinematicGenerationState } from '@/lib/cinematic/quick-cut/cinematic-assembly-timing'
import { runCinematicAssemblyPresentation } from '@/lib/cinematic/quick-cut/run-cinematic-assembly'

export type { CinematicGenerationState }

let pipelineStartedAt = 0

export type QuickCutGenerationStep =
  | 'idle'
  | 'analyzing'
  | 'title'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'images'
  | 'voice'
  | 'render'
  | 'complete'
  | 'error'

export const STEP_PROGRESS: Record<QuickCutGenerationStep, number> = {
  idle: 0,
  analyzing: 0,
  title: 10,
  hook: 15,
  script: 30,
  scenes: 45,
  images: 60,
  voice: 75,
  render: 88,
  complete: 100,
  error: 0,
}

export const STEP_LABELS: Record<QuickCutGenerationStep, string> = {
  idle: '',
  analyzing: 'Reading your brief…',
  title: 'Generating viral title…',
  hook: 'Crafting hook…',
  script: 'Writing cinematic script…',
  scenes: 'Building emotional pacing…',
  images: 'Generating cinematic visuals…',
  voice: 'Synthesizing voiceover…',
  render: 'Packaging storyboard export…',
  complete: 'Your cinematic video is ready',
  error: 'Generation paused',
}

export type QuickCutInput = {
  prompt: string
  style?: string
  duration?: number
  imageNote?: string
  voiceNote?: string
  keywords?: string[]
  /** Preserve existing project row on re-run (UPDATE not INSERT) */
  reuseProject?: boolean
  /** Full project regen — same context, fresh script + images */
  regenFresh?: boolean
  /** Raw voice transcript before prompt assembly */
  originalTranscript?: string
  inputType?: 'text' | 'voice' | 'mixed'
  /** Skip pre-script deep research (faster) */
  skipResearch?: boolean
  /** Explicit output language — defaults to English or saved preference */
  language?: ProjectLanguage
  /** Resume pipeline after last_completed_step (skips completed steps) */
  resumeFrom?: PersistedGenerationStep | null
}

export type QuickCutSaveState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'resumed'

interface QuickCutGenerationStateBase {
  generationStep: QuickCutGenerationStep
  activeStageTab: QuickCutStageTab
  stageTabPinned: boolean
  prompt: string
  title: string
  hook: string
  previousHooks: string[]
  hookVariantNumber: number
  script: string
  scriptBeats: ScriptBeat[]
  payoff: string
  cta: string
  characterDescription: string
  scenes: GeneratedScene[]
  storyboard: GeneratedScene[]
  regeneratingSceneIds: string[]
  directingSceneLabel: string | null
  voiceUrl: string | null
  elevenLabsVoiceId: string | null
  voiceName: string | null
  voiceFallbackMessage: string | null
  waveform: number[]
  progress: number
  eta: number
  videoUrl: string | null
  renderPollUrl: string | null
  renderError: string | null
  renderStatusLabel: string | null
  isRenderingVideo: boolean
  exportPackageReady: boolean
  /** MP4 URL missing or download failed — user must re-export. */
  exportExpired: boolean
  videoRenderEnabled: boolean
  virlo: VirloMetadata | null
  language: ProjectLanguage
  niche: CinematicNiche
  style: string
  duration: number
  visualStyle: VisualStyle | null
  viralScript: ViralScript | null
  inputType: 'text' | 'voice' | 'mixed'
  originalTranscript: string
  variationHistory: VariationHistory
  isRegeneratingHook: boolean
  isRegeneratingTitle: boolean
  isRegeneratingScript: boolean
  mock: boolean
  missingKeys: string[]
  pipeline: QuickCutPipelineStatus | null
  error: string | null
  generationStatus: GenerationStatus
  lastCompletedStep: PersistedGenerationStep | null
  failedAtStep: PersistedGenerationStep | null
  isGenerating: boolean
  isComplete: boolean
  /** Saved project opened via OPEN — show storyboard studio instead of export/home. */
  studioReviewMode: boolean
  savedProjectId: string | null
  saveState: QuickCutSaveState
  saveError: string | null
  lastSavedAt: number | null
  /** Prompt used for the last completed pipeline — topic-change detection */
  lastGeneratedPrompt: string | null
  /** Visual reference note from canvas uploader — triggers SOP style prefix at image gen */
  imageNote: string | null
  /** Post-image cinematic assembly presentation (does not block API steps). */
  generationState: CinematicGenerationState
  assemblyLineIndex: number
  assemblyPreviewAutoplay: boolean
}

interface QuickCutGenerationState extends QuickCutGenerationStateBase, DeepResearchStoreFields, StoryboardStoreFields {}

interface QuickCutGenerationActions {
  reset: (options?: { clearProject?: boolean }) => void
  setActiveStageTab: (tab: QuickCutStageTab, pinned?: boolean) => void
  followPipelineStage: () => void
  runPipeline: (input: QuickCutInput) => Promise<void>
  resumeGeneration: () => Promise<void>
  regenerateHook: () => Promise<void>
  regenerateTitle: () => Promise<void>
  regenerateScript: () => Promise<void>
  regenerateSceneImage: (sceneId: string) => Promise<void>
  updateSceneImagePrompt: (sceneId: string, imagePrompt: string) => Promise<void>
  generateSceneVariations: (sceneId: string) => Promise<void>
  selectHookVersion: (versionId: string) => void
  selectStoryboardVersion: (versionId: string) => void
  markProjectExported: () => Promise<void>
  retryVideoRender: () => Promise<void>
  resumeRenderPoll: () => Promise<void>
  /** Refresh server video-render flag (VIDEO_RENDER_ENABLED) for export/compile UI. */
  syncVideoRenderConfig: () => Promise<void>
  saveProject: () => Promise<string | null>
  loadSavedProject: (
    projectId: string,
    options?: { stageTab?: QuickCutStageTab }
  ) => Promise<boolean>
  setSelectedElevenLabsVoice: (voiceId: string, name: string) => void
  ensureRecommendedElevenLabsVoice: () => Promise<void>
}

const INITIAL: QuickCutGenerationState = {
  generationStep: 'idle',
  activeStageTab: 'title',
  stageTabPinned: false,
  prompt: '',
  title: '',
  hook: '',
  previousHooks: [],
  hookVariantNumber: 1,
  script: '',
  scriptBeats: [],
  payoff: '',
  cta: '',
  scenes: [],
  storyboard: [],
  characterDescription: '',
  directingSceneLabel: null,
  regeneratingSceneIds: [],
  voiceUrl: null,
  elevenLabsVoiceId: null,
  voiceName: null,
  voiceFallbackMessage: null,
  waveform: [],
  progress: 0,
  eta: 14,
  videoUrl: null,
  renderPollUrl: null,
  renderError: null,
  renderStatusLabel: null,
  isRenderingVideo: false,
  exportPackageReady: false,
  exportExpired: false,
  videoRenderEnabled: false,
  virlo: null,
  language: 'en',
  niche: 'storytelling',
  style: 'cinematic',
  duration: 60,
  visualStyle: null,
  viralScript: null,
  inputType: 'text',
  originalTranscript: '',
  variationHistory: emptyVariationHistory(),
  isRegeneratingHook: false,
  isRegeneratingTitle: false,
  isRegeneratingScript: false,
  mock: false,
  missingKeys: [],
  pipeline: null,
  error: null,
  generationStatus: 'pending',
  lastCompletedStep: null,
  failedAtStep: null,
  isGenerating: false,
  isComplete: false,
  studioReviewMode: false,
  savedProjectId: null,
  saveState: 'idle',
  saveError: null,
  lastSavedAt: null,
  lastGeneratedPrompt: null,
  researchDocument: null,
  researchReport: null,
  researchMock: false,
  imageNote: null,
  generationState: 'idle',
  assemblyLineIndex: 0,
  assemblyPreviewAutoplay: false,
  ...EMPTY_STORYBOARD_FIELDS,
}

const SAVE_FLASH_MS = 2500

function flashSavedState() {
  setTimeout(() => {
    const current = useQuickCutGenerationStore.getState()
    if (current.saveState === 'saved') {
      useQuickCutGenerationStore.setState({ saveState: 'idle' })
    }
  }, SAVE_FLASH_MS)
}

function applyScriptOutput(
  output: Record<string, unknown> | undefined,
  hook: string
): {
  script: string
  scriptBeats: ScriptBeat[]
  payoff: string
  cta: string
} {
  const cinematic = resolveCinematicScript({
    scriptBeats: output?.scriptBeats as ScriptBeat[] | undefined,
    script: typeof output?.script === 'string' ? output.script : '',
    hook: typeof output?.hook === 'string' ? output.hook : hook,
    payoff: typeof output?.payoff === 'string' ? output.payoff : '',
    cta: typeof output?.cta === 'string' ? output.cta : '',
  })
  return {
    script: deriveScriptText(cinematic),
    scriptBeats: cinematic.scriptBeats,
    payoff: cinematic.payoff,
    cta: cinematic.cta,
  }
}

function buildGenerationOutput(
  state: QuickCutGenerationState
): CinematicGenerationOutput {
  const visualDefaults = state.visualStyle
    ? {
        cameraAngle: state.visualStyle.camera,
        lightingMood: state.visualStyle.lighting,
        environment: state.visualStyle.environment,
        colorPalette: state.visualStyle.palette,
        movementStyle: state.visualStyle.movement,
      }
    : {
        cameraAngle: 'Cinematic medium',
        lightingMood: 'Motivated key light',
        environment: 'Contextual setting',
        colorPalette: 'Natural contrast',
        movementStyle: 'Slow drift',
      }

  const cinematic = resolveCinematicScript({
    scriptBeats: state.scriptBeats,
    script: state.script,
    hook: state.hook,
    payoff: state.payoff,
    cta: state.cta,
  })

  return {
    title: state.title,
    hook: state.hook,
    summary: state.hook,
    script: deriveScriptText(cinematic),
    scriptBeats: cinematic.scriptBeats,
    payoff: cinematic.payoff,
    cta: cinematic.cta,
    scenes: state.scenes.map((s, i) => ({
      id: s.id || `scene-${i}`,
      title: s.title || `Scene ${i + 1}`,
      description: s.description || '',
      duration: s.duration ?? 4,
      visualPrompt:
        s.visualPrompt ||
        (state.visualStyle
          ? `${state.visualStyle.label}. ${visualDefaults.cameraAngle}.`
          : ''),
      imagePrompt: s.imagePrompt || '',
      cameraAngle: s.cameraAngle || visualDefaults.cameraAngle,
      lightingMood: s.lightingMood || visualDefaults.lightingMood,
      environment: s.environment || visualDefaults.environment,
      colorPalette: s.colorPalette || visualDefaults.colorPalette,
      movementStyle: s.movementStyle || visualDefaults.movementStyle,
      imageUrl: s.imageUrl,
    })),
    captions: state.script.split('\n').filter(Boolean).slice(0, 8),
    captionPack: {
      primary: state.hook,
      cta: state.cta || 'Save this for later.',
      hashtags: ['#cinematic', '#storytelling', '#faceless'],
    },
    suggestedVoiceStyle: 'warm_documentary',
    niche: state.niche,
  }
}

function parseStoryboardFromApi(
  data: Record<string, unknown>
): Partial<StoryboardStoreFields> {
  const scenes = Array.isArray(data.storyboardScenes)
    ? (data.storyboardScenes as StoryboardScene[])
    : []
  if (scenes.length < 1) return {}

  return {
    storyboardScenes: scenes,
    storyboardPrompts: Array.isArray(data.storyboardPrompts)
      ? data.storyboardPrompts.filter((p): p is string => typeof p === 'string')
      : scenes.map((s) => s.imagePrompt),
    sceneCount:
      typeof data.sceneCount === 'number' ? data.sceneCount : scenes.length,
    visualTimeline: Array.isArray(data.visualTimeline)
      ? (data.visualTimeline as StoryboardStoreFields['visualTimeline'])
      : [],
  }
}

function buildArchiveInput(
  state: QuickCutGenerationState,
  output: CinematicGenerationOutput
): ArchiveGeneratedProjectInput {
  const storedScenes = scenesToStore(output.scenes)
  const thumbnail =
    storedScenes[0]?.imageUrl?.trim() ??
    storedScenes.find((s) => s.imageUrl)?.imageUrl ??
    storedScenes[0]?.storyboardImages?.[0]?.url ??
    null

  return {
    projectId: state.savedProjectId,
    title: state.title || 'Untitled reel',
    prompt: state.prompt,
    mode: 'quick',
    script: deriveScriptText(
      resolveCinematicScript({
        scriptBeats: state.scriptBeats,
        script: state.script,
        hook: state.hook,
        payoff: state.payoff,
        cta: state.cta,
      })
    ),
    scriptBeats: state.scriptBeats.length
      ? { beats: state.scriptBeats, payoff: state.payoff, cta: state.cta }
      : null,
    payoff: state.payoff,
    cta: state.cta,
    scenes: storedScenes,
    storyboard: storedScenes,
    voice: state.voiceUrl
      ? {
          voiceId: state.elevenLabsVoiceId ?? undefined,
          voiceName: state.voiceName || 'Cinematic Narrator',
          style: 'warm_documentary',
          audioUrl: state.voiceUrl,
          narration: narrationFromCinematicScript(
            resolveCinematicScript({
              scriptBeats: state.scriptBeats,
              script: state.script,
              hook: state.hook,
              payoff: state.payoff,
              cta: state.cta,
            }),
            false
          ),
        }
      : null,
    duration: coerceDuration(state.duration),
    status: state.videoUrl
      ? completedStatus()
      : state.isComplete
        ? reviewingStatus()
        : editingStatus(),
    video_url: state.videoUrl,
    reel_url: state.videoUrl,
    reel_status: state.videoUrl ? 'ready' : undefined,
    thumbnail_url: thumbnail,
    hook: state.hook,
    summary: state.hook,
    captionLines: output.captions,
    style: state.style,
    niche: state.niche,
    virlo: state.virlo,
    language: state.language,
    input_type: state.inputType,
    original_transcript: state.originalTranscript || state.prompt,
    variation_history: state.variationHistory,
    visual_style: state.visualStyle,
    viral_script: state.viralScript,
    generation_status: state.generationStatus,
    generation_step: state.lastCompletedStep ?? undefined,
    last_completed_step: state.lastCompletedStep,
    generation_error:
      state.generationStatus === 'failed' ? state.error : null,
  }
}

async function saveCompletedStages(
  state: QuickCutGenerationState,
  userError: string
): Promise<void> {
  const lastCompleted = inferLastCompletedStep(state)
  const archiveInput = buildArchiveInput(state, buildGenerationOutput(state))
  await persistGenerationFailed(
    { savedProjectId: state.savedProjectId, script: state.script, scenes: state.scenes },
    archiveInput,
    lastCompleted,
    userError
  )
  logGenerationRecoverable(state.savedProjectId, lastCompleted, userError)
}

function resolveSaveError(err: unknown): string {
  if (err instanceof CinematicProjectsUnavailableError) return err.message
  if (isCinematicProjectsUnavailable(err)) return CINEMATIC_PROJECTS_MIGRATION_HINT
  if (err instanceof Error && err.message === 'Not signed in') {
    return 'Sign in to save'
  }
  if (err instanceof Error && err.message.trim()) return err.message
  return 'Could not save to library — try again.'
}

async function archiveQuickCutProject(
  state: QuickCutGenerationState
): Promise<string | null> {
  if (!state.script && state.scenes.length < 1) return null
  const output = buildGenerationOutput(state)
  const row = await archiveGeneratedProject(buildArchiveInput(state, output))
  if (!row?.id) throw new Error('Save returned no project id')
  useQuickCutGenerationStore.setState({
    savedProjectId: row.id,
    saveState: 'saved',
    saveError: null,
    lastSavedAt: Date.now(),
  })
  streakRecordWorkflowCreated()
  flashSavedState()
  return row.id
}

async function ensureProjectArchived(
  state: QuickCutGenerationState
): Promise<string | null> {
  if (state.savedProjectId) return state.savedProjectId
  if (!state.script && state.scenes.length < 1) return null
  return archiveQuickCutProject(state)
}

function appendPreviousHook(previousHooks: string[], hook: string): string[] {
  const trimmed = hook.trim()
  if (!trimmed) return previousHooks
  if (previousHooks.some((h) => h.trim() === trimmed)) return previousHooks
  return [...previousHooks, trimmed]
}

function buildQuickCutRegenPayload(state: QuickCutGenerationState) {
  return {
    topic: state.prompt,
    prompt: state.prompt,
    tone: state.style,
    style: state.style,
    duration: state.duration,
    niche: state.niche,
    language: state.language,
    visualStyle: state.visualStyle,
    viralScript: state.viralScript,
    hook: state.hook,
    summary: state.hook,
    script: state.script,
    scenes: state.scenes.map((scene, i) => ({
      id: scene.id || `scene-${i}`,
      index: i + 1,
      title: scene.title,
      narration: scene.description,
      duration: scene.duration,
      visualPrompt: scene.visualPrompt,
      cameraAngle: scene.cameraAngle,
      lightingMood: scene.lightingMood,
      environment: scene.environment,
      colorPalette: scene.colorPalette,
      movementStyle: scene.movementStyle,
    })),
    captionLines: state.script.split('\n').filter(Boolean).slice(0, 8),
    suggestedVoiceStyle: 'warm_documentary',
  }
}

async function requestHookRegeneration(
  state: QuickCutGenerationState,
  strongVariation = false
): Promise<{
  hook: string
  hookVariantNumber?: number
  hookFramework?: string
  virlo?: VirloMetadata | null
}> {
  try {
    return await requestHookRegen(buildQuickCutRegenPayload(state), {
      previousHooks: state.previousHooks,
      hookVariantIndex: state.previousHooks.length + (strongVariation ? 1 : 0),
      hookVariantNumber: state.hookVariantNumber,
      strongVariation,
      emotionalGoal: state.virlo?.emotionalGoal,
    })
  } catch {
    const res = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: state.prompt,
        sessionSeed: `${state.prompt}-${state.previousHooks.length}-${Date.now()}`,
        previousHooks: [...state.previousHooks, state.hook].filter(Boolean),
        hookVariantIndex: state.previousHooks.length + (strongVariation ? 1 : 0),
        language: state.language,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new Error(String(data?.error || 'Hook regeneration failed'))
    }
    const hook = String(data.hook ?? '')
    if (!hook.trim()) throw new Error('Hook regeneration returned empty result')
    return {
      hook,
      virlo: (data.virlo as VirloMetadata | undefined) ?? state.virlo,
      hookVariantNumber: state.hookVariantNumber + 1,
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchSceneImages(
  state: Pick<
    QuickCutGenerationState,
    | 'scenes'
    | 'characterDescription'
    | 'virlo'
    | 'hook'
    | 'script'
    | 'niche'
    | 'style'
    | 'visualStyle'
    | 'language'
    | 'imageNote'
  >,
  sceneIds?: string[],
  variation = false,
  diversityAttempt = 0
): Promise<{
  scenes: GeneratedScene[]
  mock: boolean
  characterDescription?: string
}> {
  const res = await fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: state.scenes,
      sceneIds,
      variation,
      characterDescription: state.characterDescription || undefined,
      virlo: state.virlo ?? undefined,
      hook: state.hook,
      script: state.script,
      niche: state.niche,
      style: state.style,
      visualStyle: state.visualStyle ?? undefined,
      language: state.language,
      referenceStyleNote: state.imageNote ?? undefined,
      hasReferenceStyle: Boolean(state.imageNote?.trim()),
      diversityAttempt,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(data?.error || 'Scene image generation failed'))
  }
  return {
    scenes: Array.isArray(data.scenes)
      ? ensureScenesHaveImagePrompts(data.scenes as GeneratedScene[])
      : state.scenes,
    mock: data.mock === true,
    characterDescription:
      typeof data.characterDescription === 'string'
        ? data.characterDescription
        : undefined,
  }
}

function mergeScenesById(
  current: GeneratedScene[],
  patch: GeneratedScene[],
  ids?: string[]
): GeneratedScene[] {
  const idSet = ids?.length ? new Set(ids) : null
  const patchMap = new Map(patch.map((s) => [s.id, s]))
  return current.map((scene) => {
    if (idSet && !idSet.has(scene.id)) return scene
    const next = patchMap.get(scene.id)
    return next ? { ...scene, ...next } : scene
  })
}

function stripSceneImages(scenes: GeneratedScene[]): GeneratedScene[] {
  return scenes.map((scene) => ({
    ...scene,
    imageUrl: undefined,
    variationImageUrl: undefined,
  }))
}

function appendNotes(
  prompt: string,
  imageNote?: string,
  voiceNote?: string,
  keywords?: string[]
): string {
  const parts = [prompt.trim()]
  if (keywords?.length) parts.push(`Mood keywords: ${keywords.join(', ')}`)
  if (imageNote?.trim()) parts.push(`Visual reference: ${imageNote.trim()}`)
  if (voiceNote?.trim()) parts.push(`Voice presence: ${voiceNote.trim()}`)
  return parts.filter(Boolean).join('\n\n')
}

function setStep(
  set: (patch: Partial<QuickCutGenerationState>) => void,
  get: () => QuickCutGenerationState,
  step: QuickCutGenerationStep
) {
  const progress = STEP_PROGRESS[step]
  const patch: Partial<QuickCutGenerationState> = {
    generationStep: step,
    progress,
    eta: step === 'complete' ? 0 : Math.max(0, Math.round((100 - progress) * 0.14)),
  }
  if (!get().stageTabPinned) {
    const tab = generationStepToTab(step)
    if (tab) patch.activeStageTab = tab
  }
  set(patch)
}

async function pollRenderJob(
  pollUrl: string,
  onUpdate?: (patch: { videoUrl?: string; label?: string }) => void,
  maxAttempts = 120,
  projectId?: string | null
): Promise<string> {
  const { pollReelExportJob } = await import('@/lib/reels/export-poll.client')
  return pollReelExportJob(pollUrl, {
    maxAttempts,
    projectId,
    onProgress: (patch) => {
      if (patch.label) onUpdate?.({ label: patch.label })
    },
  }).then((url) => {
    onUpdate?.({ videoUrl: url })
    return url
  })
}

async function requestVideoRender(state: QuickCutGenerationState, asyncMode: boolean) {
  if (state.savedProjectId && asyncMode) {
    const exportRes = await fetch('/api/reels/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.savedProjectId,
        quality: '1080p',
        includeVoiceover: true,
        includeCaptions: true,
      }),
    })
    const exportData = (await exportRes.json()) as Record<string, unknown>
    if (exportRes.ok && exportData.status === 'completed' && typeof exportData.reelUrl === 'string') {
      return {
        renderRes: exportRes,
        renderData: { videoUrl: exportData.reelUrl, status: 'completed' },
      }
    }
    if (exportRes.ok && typeof exportData.jobId === 'string') {
      const { reelExportPollPath } = await import('@/lib/reels/export-paths')
      return {
        renderRes: exportRes,
        renderData: {
          jobId: exportData.jobId,
          status: exportData.status ?? 'queued',
          pollUrl: reelExportPollPath(
            exportData.jobId,
            state.savedProjectId ?? undefined
          ),
        },
      }
    }
    return { renderRes: exportRes, renderData: exportData }
  }

  const renderRes = await fetch('/api/render/reel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea: state.prompt,
      title: state.title,
      script: state.script,
      scenes: state.scenes,
      voiceUrl: state.voiceUrl,
      async: asyncMode,
      projectId: state.savedProjectId ?? undefined,
    }),
  })
  const renderData = (await renderRes.json()) as Record<string, unknown>
  return { renderRes, renderData }
}

async function loadElevenLabsVoicesFromApi(): Promise<ElevenLabsVoiceOption[]> {
  try {
    const res = await fetch('/api/elevenlabs/voices')
    const data = (await res.json()) as { voices?: ElevenLabsVoiceOption[] }
    return Array.isArray(data.voices) ? data.voices : []
  } catch {
    return []
  }
}

async function ensureRecommendedElevenLabsVoiceForState(
  state: Pick<QuickCutGenerationState, 'elevenLabsVoiceId' | 'language' | 'niche' | 'style'>
): Promise<{ voiceId: string; name: string } | null> {
  if (state.elevenLabsVoiceId) return null
  const styleId = recommendVoiceStyle({
    niche: state.niche,
    tone: state.style,
  })
  const category = voiceStyleToElevenCategory(styleId)
  const voices = await loadElevenLabsVoicesFromApi()
  if (voices.length < 1) return null
  const pick = pickRecommendedVoice(voices, state.language, category)
  return { voiceId: pick.voiceId, name: pick.name }
}

function persistHookSession(state: QuickCutGenerationState) {
  saveHookSession({
    previousHooks: state.previousHooks,
    hookVariantNumber: state.hookVariantNumber,
  })
}

function restoreHookSession(): Pick<
  QuickCutGenerationState,
  'previousHooks' | 'hookVariantNumber'
> {
  const session = loadHookSession()
  if (!session) {
    return { previousHooks: [], hookVariantNumber: 1 }
  }
  return {
    previousHooks: session.previousHooks,
    hookVariantNumber: session.hookVariantNumber,
  }
}

function persistSession(state: QuickCutGenerationState) {
  const output = buildGenerationOutput(state)

  applyGenerationToStore(output)

  const previewFrames = state.scenes
    .map((s) => s.imageUrl)
    .filter((u): u is string => Boolean(u))

  const previewRhythm = mergePreviewRhythm(
    buildEmotionalPreviewRhythm(output.scenes, 60)
  )

  saveQuickCutPreview({
    output,
    project: {
      title: state.title,
      prompt: state.prompt,
      style: state.style,
      duration: state.duration,
      hook: state.hook,
      summary: state.hook,
      script: state.script,
      scenes: scenesToStore(output.scenes),
      voice: state.voiceUrl
        ? {
            voiceId: state.elevenLabsVoiceId ?? undefined,
            voiceName: state.voiceName || 'Cinematic Narrator',
            style: 'warm_documentary',
            audioUrl: state.voiceUrl,
            narration: state.script,
          }
        : null,
      captionLines: output.captions,
      suggestedVoiceStyle: 'warm_documentary',
      niche: state.niche,
      status: state.videoUrl ? 'complete' : 'preview',
    },
    previewFrames,
    previewRhythm,
    presenceLine: state.hook || 'Your world is taking shape.',
    mock: state.mock,
    pipeline:
      state.pipeline ??
      ({
        steps: {
          script: state.mock ? 'fallback' : 'live',
          images: state.mock ? 'fallback' : 'live',
          voice: state.voiceUrl ? 'live' : 'fallback',
          video: state.videoUrl ? 'live' : 'skipped',
        },
        missingKeys: state.missingKeys,
        live: !state.mock,
      } satisfies QuickCutPipelineStatus),
    sessionId: `quick-cut-${Date.now()}`,
    savedProjectId: state.savedProjectId,
    language: state.language,
    visualStyle: state.visualStyle ?? undefined,
    viralScript: state.viralScript ?? undefined,
    variationHistory: state.variationHistory,
    virlo: state.virlo ?? undefined,
    videoUrl: state.videoUrl,
    voiceUrl: state.voiceUrl,
    renderPollUrl: state.renderPollUrl,
    renderError: state.renderError,
  })

  void archiveQuickCutProject(state).catch((err) => {
    useQuickCutGenerationStore.setState({
      saveState: 'error',
      saveError:
        isCinematicProjectsUnavailable(err) || err instanceof CinematicProjectsUnavailableError
          ? CINEMATIC_PROJECTS_MIGRATION_HINT
          : resolveSaveError(err),
    })
  })

  persistHookSession(state)
}

export const useQuickCutGenerationStore = create<
  QuickCutGenerationState & QuickCutGenerationActions
>((set, get) => ({
  ...INITIAL,

  setSelectedElevenLabsVoice: (voiceId, name) => {
    set({ elevenLabsVoiceId: voiceId, voiceName: name })
    const state = get()
    if (state.savedProjectId && state.script.trim()) {
      void archiveQuickCutProject(state).catch(() => {})
    }
  },

  ensureRecommendedElevenLabsVoice: async () => {
    const recommended = await ensureRecommendedElevenLabsVoiceForState(get())
    if (recommended) {
      set({
        elevenLabsVoiceId: recommended.voiceId,
        voiceName: recommended.name,
      })
    }
  },

  reset: (options) => {
    const savedProjectId = options?.clearProject ? null : get().savedProjectId
    const lastGeneratedPrompt = options?.clearProject
      ? null
      : get().lastGeneratedPrompt
    clearHookSession()
    set({ ...INITIAL, savedProjectId, lastGeneratedPrompt, studioReviewMode: false })
  },

  setActiveStageTab: (tab, pinned = true) =>
    set({ activeStageTab: tab, stageTabPinned: pinned }),

  followPipelineStage: () => {
    const tab = generationStepToTab(get().generationStep)
    if (tab) set({ activeStageTab: tab, stageTabPinned: false })
  },

  resumeGeneration: async () => {
    const state = get()
    if (state.isGenerating || !state.prompt.trim()) return
    const resumeFrom = state.lastCompletedStep
    if (!resumeFrom && state.generationStatus !== 'failed') return

    await get().runPipeline({
      prompt: state.prompt,
      style: state.style,
      duration: state.duration,
      imageNote: state.imageNote ?? undefined,
      reuseProject: true,
      resumeFrom,
      skipResearch: true,
    })
  },

  runPipeline: async (input) => {
    const rawPrompt = input.prompt.trim()
    const prompt = appendNotes(rawPrompt, input.imageNote, input.voiceNote, input.keywords)
    if (prompt.length < 6) return

    const prior = get()
    const resumeFrom = input.resumeFrom ?? null
    const isResume = Boolean(resumeFrom)
    const lastPrompt =
      prior.lastGeneratedPrompt?.trim() || prior.prompt?.trim() || ''
    const hadPriorWork = Boolean(
      prior.script?.trim() ||
        prior.lastGeneratedPrompt?.trim() ||
        prior.isComplete ||
        prior.studioReviewMode
    )
    const topicChanged =
      hadPriorWork && lastPrompt.length > 0 && quickCutTopicChanged(lastPrompt, prompt)
    const sameTopicRerun =
      hadPriorWork && lastPrompt.length > 0 && !topicChanged
    const regenFresh =
      input.regenFresh === true || topicChanged || sameTopicRerun

    if (regenFresh) {
      clearQuickCutPreview()
    }

    const preserved = regenFresh
      ? {
          savedProjectId: prior.savedProjectId,
          visualStyle: prior.visualStyle,
          niche: prior.niche,
          language: prior.language,
          elevenLabsVoiceId: prior.elevenLabsVoiceId,
          voiceName: prior.voiceName,
          originalTranscript: prior.originalTranscript,
          previousScript: prior.script,
          previousHook: prior.hook,
          previousHooks: prior.previousHooks,
          previousTopic: lastPrompt,
          topicChanged,
        }
      : null

    const language = regenFresh
      ? preserved?.language ?? input.language ?? loadContentLanguagePreference()
      : input.language ?? loadContentLanguagePreference()
    const tone = input.style ?? (regenFresh ? prior.style : undefined) ?? 'cinematic'
    const duration = coerceDuration(input.duration ?? prior.duration ?? 60)
    const preserveProjectId =
      input.reuseProject !== false
        ? preserved?.savedProjectId ?? prior.savedProjectId
        : null
    const inputType =
      input.inputType ??
      (input.voiceNote?.trim() || input.originalTranscript?.trim() ? 'voice' : 'text')

    const sessionSeed = regenFresh ? `${prompt}-regen-${Date.now()}` : prompt
    const regenAvoidHooks = regenFresh
      ? [preserved?.previousHook, ...(preserved?.previousHooks ?? [])].filter(
          (h): h is string => Boolean(h?.trim())
        )
      : []

    if (isResume) {
      logGenerationResumed(preserveProjectId, resumeFrom)
      trackEvent(AnalyticsEvents.RESUME_GENERATION, {
        projectId: preserveProjectId,
        metadata: { resume_from: resumeFrom },
      })
      set({
        isGenerating: true,
        generationStatus: 'generating',
        generationStep: 'analyzing',
        error: null,
        failedAtStep: null,
        saveState: 'resumed',
        studioReviewMode: false,
        prompt,
        language,
        style: tone,
        duration,
        imageNote: input.imageNote?.trim() || prior.imageNote,
      })
    } else {
      set({
        ...INITIAL,
        ...(regenFresh ? {} : restoreHookSession()),
        savedProjectId: preserveProjectId,
        studioReviewMode: false,
        prompt,
        language,
        style: tone,
        duration,
        niche:
          regenFresh && !topicChanged ? preserved?.niche ?? 'storytelling' : 'storytelling',
        visualStyle:
          regenFresh && !topicChanged ? preserved?.visualStyle ?? null : null,
        inputType,
        originalTranscript:
          input.originalTranscript?.trim() ||
          preserved?.originalTranscript ||
          rawPrompt,
        imageNote: input.imageNote?.trim() || null,
        elevenLabsVoiceId: regenFresh ? preserved?.elevenLabsVoiceId ?? null : null,
        voiceName: regenFresh ? preserved?.voiceName ?? null : null,
        voiceFallbackMessage: null,
        previousHooks: regenFresh ? regenAvoidHooks : restoreHookSession().previousHooks,
        hookVariantNumber: regenFresh
          ? regenAvoidHooks.length + 1
          : restoreHookSession().hookVariantNumber,
        variationHistory: emptyVariationHistory(),
        isGenerating: true,
        generationStatus: 'generating',
        generationStep: 'analyzing',
        activeStageTab: 'title',
        stageTabPinned: false,
        progress: 0,
        eta: 14,
        lastCompletedStep: null,
        failedAtStep: null,
      })
    }

    logGenerationStart(preserveProjectId, prompt)
    pipelineStartedAt = Date.now()
    trackEvent(AnalyticsEvents.GENERATION_STARTED, {
      projectId: preserveProjectId,
      metadata: {
        resume: isResume,
        duration,
        niche: get().niche,
        style: tone,
      },
    })

    let anyMock = false
    const missingKeys = new Set<string>()

    const configRes = await fetch('/api/quick-cut/config')
    const config = (await configRes.json().catch(() => ({}))) as Record<string, boolean>
    const videoRenderEnabled = config.videoRenderEnabled === true
    set({ videoRenderEnabled })

    const freeTier = config.freeTierOnly === true
    const noteMissing = (step: 'script' | 'images' | 'voice' | 'video') => {
      if (step === 'script' && config.script !== true) {
        if (freeTier) {
          missingKeys.add('GEMINI_API_KEY')
        } else {
          missingKeys.add('GEMINI_API_KEY')
          missingKeys.add('ANTHROPIC_API_KEY')
          missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'images' && !config.images) {
        if (freeTier || config.geminiDirect) {
          missingKeys.add('GEMINI_API_KEY')
        } else {
          if (!config.emergent && !config.gemini) missingKeys.add('EMERGENT_LLM_KEY')
          if (!config.openai) missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'voice' && !config.elevenlabs && !config.openai && !config.emergent) {
        if (freeTier) {
          missingKeys.add('OPENAI_API_KEY')
        } else {
          missingKeys.add('ELEVENLABS_API_KEY')
          missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'video' && videoRenderEnabled && !config.ffmpeg) {
        missingKeys.add('FFMPEG_PATH')
      }
    }

    try {
      setStep(set, get, 'analyzing')

      let title = get().title
      let hook = get().hook
      let virlo = get().virlo

      if (stepShouldRun(resumeFrom, 'hook')) {
        setStep(set, get, 'title')
        const { res: titleRes, data: titleData } = await pipelineFetchJson(
          '/api/generate-title',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idea: prompt,
              sessionSeed,
              language,
              ...(regenAvoidHooks.length ? { previousHooks: regenAvoidHooks } : {}),
            }),
            maxRetries: 2,
          }
        )
        if (!titleRes.ok) {
          logStepFailed('hook', get().savedProjectId, 'title')
          throw new Error(String(titleData?.error || 'Title generation failed'))
        }

        title = String(titleData.title ?? '')
        hook = String(titleData.hook ?? '')
        virlo = (titleData.virlo as VirloMetadata | undefined) ?? null
        if (titleData.mock === true) anyMock = true

        setStep(set, get, 'hook')
        set({
          title,
          hook,
          virlo,
          storyboard: isResume ? get().storyboard : [],
          previousHooks: regenFresh ? regenAvoidHooks : [],
          hookVariantNumber: regenFresh ? regenAvoidHooks.length + 1 : 1,
          variationHistory: appendHookVersion(emptyVariationHistory(), hook, {
            select: true,
          }),
        })
        persistHookSession(get())

        const hookId = await persistStepComplete(
          get(),
          'hook',
          buildArchiveInput(get(), buildGenerationOutput(get()))
        )
        if (hookId) {
          const hadProject = Boolean(preserveProjectId)
          set({ savedProjectId: hookId, saveState: 'saved' })
          if (!hadProject) {
            trackEvent(AnalyticsEvents.PROJECT_CREATED, {
              projectId: hookId,
              metadata: { source: 'quick_cut' },
            })
          }
        }
      }

      let script = get().script
      let scriptData: Record<string, unknown> = {}
      let scriptTitle = title
      let scriptHook = hook
      let scriptNiche = get().niche
      let lockedVisualStyle = get().visualStyle
      let viralScript = get().viralScript

      if (stepShouldRun(resumeFrom, 'script')) {
        setStep(set, get, 'script')

        let researchDocument = get().researchDocument ?? undefined
        let researchReport = get().researchReport ?? undefined
        const skipPreResearch =
          input.skipResearch === true ||
          isResume ||
          Boolean(researchDocument?.trim())

        if (!skipPreResearch) {
          try {
            const researchResult = await pipelineFetchJson<
              import('@/types/deep-research').DeepResearchApiResponse
            >('/api/ai/deep-research', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic: prompt, prompt, language }),
              maxRetries: 0,
              timeoutMs: DEEP_RESEARCH_TIMEOUT_MS,
            })
            if (researchResult.res.ok) {
              const rd = researchResult.data
              researchDocument =
                typeof rd.document === 'string' ? rd.document : undefined
              researchReport =
                rd.report && typeof rd.report === 'object' ? rd.report : undefined
              set({
                researchDocument: researchDocument ?? null,
                researchReport: researchReport ?? null,
                researchMock: rd.mock === true,
              })
            }
          } catch {
            /* research is optional — script step proceeds without it */
          }
        }

        const scriptResult = await pipelineFetchJson('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: prompt,
            prompt,
            tone,
            duration,
            sessionSeed,
            language,
            title,
            hook,
            niche: preserved?.topicChanged ? undefined : preserved?.niche,
            visualStyle: preserved?.topicChanged
              ? undefined
              : preserved?.visualStyle ?? undefined,
            transcript:
              input.originalTranscript?.trim() || preserved?.originalTranscript || undefined,
            voiceNote: input.voiceNote?.trim() || undefined,
            regenFresh: regenFresh || undefined,
            previousScript: regenFresh ? preserved?.previousScript : undefined,
            previousHook: regenFresh ? preserved?.previousHook : undefined,
            creatorMemoryBias: getCreatorMemoryBiasHints(),
            skipResearch: true,
            skipStoryboard: true,
            researchDocument,
          }),
          maxRetries: 1,
          timeoutMs: SCRIPT_GENERATION_TIMEOUT_MS,
        })
        scriptData = scriptResult.data
        if (!scriptResult.res.ok) {
          logStepFailed('script', get().savedProjectId, 'script')
          throw new Error(String(scriptData?.error || 'Script generation failed'))
        }

        const output = scriptData.output as Record<string, unknown> | undefined
        const applied = applyScriptOutput(output, hook)
        script = applied.script
        scriptTitle = String(output?.title ?? title)
        scriptHook = String(output?.hook ?? hook)
        if (scriptData.mock === true) {
          anyMock = true
          noteMissing('script')
        }

        const hookHistory =
          scriptHook && scriptHook !== hook ? appendPreviousHook([], hook) : []
        lockedVisualStyle =
          regenFresh && preserved?.visualStyle
            ? preserved.visualStyle
            : scriptData.visualStyle && typeof scriptData.visualStyle === 'object'
              ? (scriptData.visualStyle as VisualStyle)
              : null
        viralScript =
          scriptData.viralScript && typeof scriptData.viralScript === 'object'
            ? (scriptData.viralScript as ViralScript)
            : null
        scriptNiche =
          regenFresh && preserved?.niche
            ? preserved.niche
            : typeof scriptData.niche === 'string'
              ? (scriptData.niche as CinematicNiche)
              : 'storytelling'

        set({
          script,
          scriptBeats: applied.scriptBeats,
          payoff: applied.payoff,
          cta: applied.cta,
          title: scriptTitle,
          hook: scriptHook,
          researchDocument:
            typeof scriptData.researchDocument === 'string'
              ? scriptData.researchDocument
              : null,
          researchReport:
            scriptData.researchReport && typeof scriptData.researchReport === 'object'
              ? (scriptData.researchReport as import('@/types/deep-research').DeepResearchReport)
              : null,
          researchMock: scriptData.researchMock === true,
          ...parseStoryboardFromApi(scriptData),
          previousHooks:
            regenFresh && hook
              ? appendPreviousHook(regenAvoidHooks, hook)
              : hookHistory,
          virlo: (scriptData.virlo as VirloMetadata | undefined) ?? virlo,
          visualStyle: lockedVisualStyle,
          viralScript,
          niche: scriptNiche,
          variationHistory: appendHookVersion(get().variationHistory, scriptHook, {
            select: true,
          }),
          lastCompletedStep: 'script',
        })

        const scriptId = await persistStepComplete(
          get(),
          'script',
          buildArchiveInput(get(), buildGenerationOutput(get()))
        )
        if (scriptId) set({ savedProjectId: scriptId, saveState: 'saved' })
      }

      const visualStyle = lockedVisualStyle

      let scenes = get().scenes
      let characterDescription = get().characterDescription
      const scriptVirlo =
        (scriptData.virlo as VirloMetadata | undefined) ?? get().virlo ?? virlo

      if (stepShouldRun(resumeFrom, 'visual_direction')) {
        setStep(set, get, 'scenes')
        const storyboardFromScript = get().storyboardScenes
        const { res: scenesRes, data: scenesData } = await pipelineFetchJson(
          '/api/generate-scenes',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idea: prompt,
              script,
              sessionSeed,
              language,
              visualStyle,
              niche: scriptNiche,
              duration,
              researchDocument: get().researchDocument ?? undefined,
              ...(storyboardFromScript.length >= 2
                ? { storyboardScenes: storyboardFromScript }
                : {}),
            }),
            maxRetries: 2,
          }
        )
        if (!scenesRes.ok) {
          logStepFailed('visual_direction', get().savedProjectId, 'scenes')
          throw new Error(String(scenesData?.error || 'Scene generation failed'))
        }

        scenes = ensureScenesHaveImagePrompts(
          Array.isArray(scenesData.scenes)
            ? (scenesData.scenes as GeneratedScene[])
            : []
        )
        if (scenesData.mock === true) anyMock = true

        characterDescription = extractCharacterDescription(script, scenes)
        scenes = scenesWithCharacterImagePrompts(scenes, {
          characterDescription,
          hook: scriptHook,
          emotionalGoal: scriptVirlo?.emotionalGoal,
          total: scenes.length,
        })

        set({
          scenes,
          storyboard: scenes,
          characterDescription,
          niche: scriptNiche,
          ...parseStoryboardFromApi(scenesData),
          lastCompletedStep: 'visual_direction',
        })

        const scenesId = await persistStepComplete(
          get(),
          'visual_direction',
          buildArchiveInput(get(), buildGenerationOutput(get()))
        )
        if (scenesId) set({ savedProjectId: scenesId, saveState: 'saved' })
      }

      if (stepShouldRun(resumeFrom, 'storyboard')) {
        scenes = stripSceneImages(scenes)
      }

      let imgMock = false
      if (stepShouldRun(resumeFrom, 'storyboard')) {
        setStep(set, get, 'images')
        set({ directingSceneLabel: 'Composing visuals…' })

        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i]
          if (!scene?.id) continue
          if (isResume && scene.imageUrl) continue

          set({ directingSceneLabel: `Directing Scene ${i + 1}…` })

          try {
            const imgResult = await fetchSceneImages(
              { ...get(), scenes, characterDescription, hook: scriptHook, script },
              [scene.id],
              false,
              regenFresh ? i + 1 : 0
            )
            scenes = mergeScenesById(scenes, imgResult.scenes, [scene.id])
            if (imgResult.characterDescription) {
              set({ characterDescription: imgResult.characterDescription })
            }
            if (imgResult.mock) {
              imgMock = true
              anyMock = true
              noteMissing('images')
            }
            set({ scenes, storyboard: scenes })
          } catch {
            imgMock = true
            anyMock = true
            noteMissing('images')
          }
        }

        set({ directingSceneLabel: null, lastCompletedStep: 'storyboard' })
        const storyboardId = await persistStepComplete(
          get(),
          'storyboard',
          buildArchiveInput(get(), buildGenerationOutput(get()))
        )
        if (storyboardId) set({ savedProjectId: storyboardId, saveState: 'saved' })
      }

      const assemblyPresentation = stepShouldRun(resumeFrom, 'storyboard')
        ? runCinematicAssemblyPresentation(get, set)
        : null

      let voiceUrl: string | null = get().voiceUrl
      let waveform: number[] = get().waveform
      let voiceFallbackMessage: string | null = get().voiceFallbackMessage

      if (stepShouldRun(resumeFrom, 'voice')) {
        setStep(set, get, 'voice')

        const voiceState = get()
        if (!voiceState.elevenLabsVoiceId) {
          const recommended = await ensureRecommendedElevenLabsVoiceForState(voiceState)
          if (recommended) {
            set({
              elevenLabsVoiceId: recommended.voiceId,
              voiceName: recommended.name,
            })
          }
        }

        const { elevenLabsVoiceId, voiceName: selectedVoiceName } = get()
        const { res: voiceRes, data: voiceData } = await pipelineFetchJson(
          '/api/generate-voice',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script,
              elevenLabsVoiceId: elevenLabsVoiceId ?? undefined,
              voiceName: selectedVoiceName ?? undefined,
            }),
          }
        )
        if (voiceRes.ok) {
          voiceUrl = typeof voiceData.audioUrl === 'string' ? voiceData.audioUrl : null
          waveform = Array.isArray(voiceData.waveform)
            ? (voiceData.waveform as number[])
            : []
          if (typeof voiceData.fallbackMessage === 'string' && voiceData.fallbackMessage) {
            voiceFallbackMessage = voiceData.fallbackMessage
          }
          if (typeof voiceData.voiceName === 'string' && voiceData.voiceName) {
            set({ voiceName: voiceData.voiceName })
          }
          if (
            typeof voiceData.elevenLabsVoiceId === 'string' &&
            voiceData.elevenLabsVoiceId
          ) {
            set({ elevenLabsVoiceId: voiceData.elevenLabsVoiceId })
          }
          if (voiceData.mock === true) {
            anyMock = true
            noteMissing('voice')
          }
        } else {
          anyMock = true
          noteMissing('voice')
          if (typeof voiceData.fallbackMessage === 'string') {
            voiceFallbackMessage = voiceData.fallbackMessage
          }
        }

        set({ voiceUrl, waveform, voiceFallbackMessage, lastCompletedStep: 'voice' })
        const voiceId = await persistStepComplete(
          get(),
          'voice',
          buildArchiveInput(get(), buildGenerationOutput(get()))
        )
        if (voiceId) set({ savedProjectId: voiceId, saveState: 'saved' })
      }

      let videoUrl: string | null = get().videoUrl
      let renderPollUrl: string | null = get().renderPollUrl
      let renderError: string | null = get().renderError
      let exportPackageReady = get().exportPackageReady

      if (stepShouldRun(resumeFrom, 'export')) {
        setStep(set, get, 'render')

        try {
          await ensureProjectArchived(get())
        } catch (err) {
          useQuickCutGenerationStore.setState({
            saveState: 'error',
            saveError: resolveSaveError(err),
          })
        }

        if (videoRenderEnabled) {
          set({ isRenderingVideo: true, renderError: null, exportExpired: false })
          try {
            const { renderRes, renderData } = await requestVideoRender(get(), true)

            if (renderRes.ok) {
              if (typeof renderData.videoUrl === 'string' && renderData.videoUrl) {
                videoUrl = renderData.videoUrl
                set({ videoUrl, renderPollUrl: null, renderError: null, exportExpired: false })
              } else if (typeof renderData.pollUrl === 'string') {
                renderPollUrl = renderData.pollUrl
                set({ renderPollUrl, renderError: null })
                try {
                  videoUrl = await pollRenderJob(
                    renderPollUrl,
                    (patch) => {
                      if (patch.label) set({ renderStatusLabel: patch.label })
                      if (patch.videoUrl) {
                        set({ videoUrl: patch.videoUrl, renderPollUrl: null, renderError: null })
                      }
                    },
                    120,
                    get().savedProjectId
                  )
                } catch (pollErr) {
                  const pollMessage =
                    pollErr instanceof Error ? pollErr.message : 'Video render timed out'
                  renderError = friendlyReelRenderError(pollMessage)
                  if (pollMessage.includes('Export job expired')) {
                    set({ exportExpired: true, videoUrl: null })
                    videoUrl = null
                  }
                }
              }
              if (renderData.mock === true) anyMock = true
            } else {
              renderError = friendlyReelRenderError(String(renderData?.error || 'Video render unavailable'))
              anyMock = true
              noteMissing('video')
            }
          } catch (renderErr) {
            renderError = friendlyReelRenderError(
              renderErr instanceof Error ? renderErr.message : 'Video render unavailable'
            )
            anyMock = true
            noteMissing('video')
          } finally {
            set({ isRenderingVideo: false })
          }
        } else {
          try {
            await simulateMockExport((label) => set({ renderStatusLabel: label }))
            exportPackageReady = true
          } catch (mockErr) {
            exportPackageReady = false
            renderError =
              mockErr instanceof Error
                ? mockErr.message
                : 'Storyboard export packaging failed'
          }
        }

        set({ lastCompletedStep: 'export' })
        const exportId = await persistStepComplete(
          get(),
          'export',
          buildArchiveInput(get(), buildGenerationOutput(get()))
        )
        if (exportId) set({ savedProjectId: exportId, saveState: 'saved' })
      }

      if (assemblyPresentation) {
        await assemblyPresentation
      }

      const pipeline: QuickCutPipelineStatus = {
        steps: {
          script:
            scriptData.mock === true ? 'fallback' : get().script.trim() ? 'live' : 'fallback',
          images: imgMock ? 'fallback' : 'live',
          voice: voiceUrl ? 'live' : 'fallback',
          video: videoRenderEnabled ? (videoUrl ? 'live' : 'skipped') : 'skipped',
        },
        missingKeys: [...missingKeys],
        live: !anyMock,
      }

      setStep(set, get, videoRenderEnabled && !videoUrl && !exportPackageReady ? 'render' : 'complete')
      set({
        videoUrl,
        renderPollUrl: videoUrl ? null : renderPollUrl,
        renderError: videoUrl ? null : renderError,
        exportPackageReady,
        mock: anyMock,
        missingKeys: [...missingKeys],
        pipeline,
        isGenerating: false,
        isComplete: true,
        generationStatus: 'completed',
        generationStep:
          videoRenderEnabled && !videoUrl && !exportPackageReady ? 'render' : 'complete',
        generationState: 'idle',
        assemblyPreviewAutoplay: false,
        assemblyLineIndex: 0,
        lastCompletedStep: 'export',
        failedAtStep: null,
        error: null,
        progress: 100,
        eta: 0,
        lastGeneratedPrompt: prompt,
        studioReviewMode: false,
        saveState: 'saved',
      })

      const completedArchive = buildArchiveInput(get(), buildGenerationOutput(get()))
      try {
        await archiveGeneratedProject({
          ...completedArchive,
          generation_status: 'completed',
          generation_step: 'export',
          last_completed_step: 'export',
          generation_error: null,
        })
      } catch {
        /* preview session still holds state */
      }

      trackEvent(AnalyticsEvents.GENERATION_COMPLETED, {
        projectId: get().savedProjectId,
        metadata: {
          duration_ms: pipelineStartedAt ? Date.now() - pipelineStartedAt : undefined,
          niche: get().niche,
          duration: get().duration,
          mock: anyMock,
        },
      })
      trackEvent(AnalyticsEvents.EXPORT_COMPLETED, {
        projectId: get().savedProjectId,
        metadata: { video: Boolean(get().videoUrl), package: get().exportPackageReady },
      })

      persistSession(get())
    } catch (err) {
      trackEvent(AnalyticsEvents.GENERATION_FAILED, {
        projectId: get().savedProjectId,
        metadata: {
          message: toUserGenerationError(err).slice(0, 120),
          step: get().generationStep,
        },
      })
      const failedAt = inferLastCompletedStep(get())
      const nextFailedStep =
        failedAt &&
        PERSISTED_STEP_ORDER[
          Math.min(
            PERSISTED_STEP_ORDER.indexOf(failedAt) + 1,
            PERSISTED_STEP_ORDER.length - 1
          )
        ]
      const userMessage = toUserGenerationError(err)
      const state = get()
      try {
        await saveCompletedStages(state, userMessage)
      } catch {
        /* recovery UI still shown */
      }
      set({
        error: userMessage,
        generationStep: 'error',
        generationStatus: 'failed',
        generationState: 'idle',
        assemblyPreviewAutoplay: false,
        lastCompletedStep: failedAt,
        failedAtStep: nextFailedStep ?? failedAt,
        isGenerating: false,
        isComplete: false,
        saveState: 'saved',
      })
    }
  },

  regenerateSceneImage: async (sceneId) => {
    const state = get()
    if (!sceneId || state.isGenerating) return
    if (!state.scenes.some((s) => s.id === sceneId)) return

    set({
      regeneratingSceneIds: [...state.regeneratingSceneIds, sceneId],
      directingSceneLabel: 'Composing visuals…',
    })

    try {
      const result = await fetchSceneImages(state, [sceneId], false, state.previousHooks.length)
      const scenes = mergeScenesById(state.scenes, result.scenes, [sceneId])
      const updated = scenes.find((s) => s.id === sceneId)
      let variationHistory = state.variationHistory
      if (updated?.imageUrl) {
        variationHistory = appendStoryboardVersion(variationHistory, {
          sceneId,
          sceneTitle: updated.title || 'Scene',
          imageUrl: updated.imageUrl,
          select: true,
        })
      }
      set({
        scenes,
        storyboard: scenes,
        variationHistory,
        characterDescription:
          result.characterDescription || state.characterDescription,
      })
      trackEvent(AnalyticsEvents.REGENERATE_SCENE, {
        projectId: get().savedProjectId,
        metadata: { scene_id: sceneId },
      })
      persistSession(get())
    } catch {
      /* silent — card shows prior frame */
    } finally {
      set({
        regeneratingSceneIds: get().regeneratingSceneIds.filter((id) => id !== sceneId),
        directingSceneLabel: null,
      })
    }
  },

  updateSceneImagePrompt: async (sceneId, imagePrompt) => {
    const state = get()
    const idx = state.scenes.findIndex((s) => s.id === sceneId)
    if (idx < 0) return

    const scenes = [...state.scenes]
    scenes[idx] = ensureScenesHaveImagePrompts([
      { ...scenes[idx], imagePrompt: imagePrompt.trim() },
    ])[0]
    set({ scenes, storyboard: scenes })
    await get().regenerateSceneImage(sceneId)
  },

  generateSceneVariations: async (sceneId) => {
    const state = get()
    if (!sceneId || state.isGenerating) return
    if (!state.scenes.some((s) => s.id === sceneId)) return

    set({
      regeneratingSceneIds: [...state.regeneratingSceneIds, sceneId],
      directingSceneLabel: 'Composing variation…',
    })

    try {
      const sceneVersions = state.variationHistory.storyboards.filter(
        (v) => v.sceneId === sceneId
      ).length
      const result = await fetchSceneImages(
        state,
        [sceneId],
        true,
        sceneVersions + 1
      )
      const scenes = mergeScenesById(state.scenes, result.scenes, [sceneId])
      const updated = scenes.find((s) => s.id === sceneId)
      let variationHistory = state.variationHistory
      const altUrl = updated?.variationImageUrl ?? updated?.imageUrl
      if (altUrl) {
        variationHistory = appendStoryboardVersion(variationHistory, {
          sceneId,
          sceneTitle: updated?.title || 'Scene',
          imageUrl: altUrl,
          select: true,
        })
      }
      set({ scenes, storyboard: scenes, variationHistory })
      persistSession(get())
    } catch {
      /* keep primary frame */
    } finally {
      set({
        regeneratingSceneIds: get().regeneratingSceneIds.filter((id) => id !== sceneId),
        directingSceneLabel: null,
      })
    }
  },

  regenerateHook: async () => {
    const state = get()
    if (!state.hook.trim() || state.isRegeneratingHook || state.isGenerating) return

    set({
      isRegeneratingHook: true,
      activeStageTab: 'hook',
      stageTabPinned: true,
    })

    try {
      const priorHooks = state.previousHooks
      const currentHook = state.hook
      const avoid = [...priorHooks, currentHook]

      let result = await requestHookRegeneration(state, false)

      if (isHookTooSimilar(result.hook, avoid)) {
        result = await requestHookRegeneration(
          { ...state, previousHooks: priorHooks },
          true
        )
      }

      const nextPrevious = appendPreviousHook(priorHooks, currentHook)
      const hookVariantNumber =
        result.hookVariantNumber ?? state.hookVariantNumber + 1
      const nextVirlo =
        result.virlo && state.virlo
          ? { ...state.virlo, ...result.virlo, hookVariant: `v${hookVariantNumber}` }
          : state.virlo
            ? { ...state.virlo, hookVariant: `v${hookVariantNumber}` }
            : result.virlo ?? null

      const variationHistory = appendHookVersion(
        state.variationHistory,
        result.hook,
        { select: true }
      )

      set({
        hook: result.hook,
        previousHooks: nextPrevious,
        hookVariantNumber,
        virlo: nextVirlo,
        viralScript: state.viralScript
          ? { ...state.viralScript, hook: result.hook }
          : state.viralScript,
        variationHistory,
      })

      trackEvent(AnalyticsEvents.REGENERATE_HOOK, { projectId: get().savedProjectId })
      persistSession(get())
    } catch {
      /* hook regen is non-blocking — user keeps current hook */
    } finally {
      set({ isRegeneratingHook: false })
    }
  },

  regenerateTitle: async () => {
    const state = get()
    if (!state.prompt.trim() || state.isRegeneratingTitle || state.isGenerating) return

    set({
      isRegeneratingTitle: true,
      activeStageTab: 'title',
      stageTabPinned: true,
    })

    try {
      const res = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: state.prompt,
          sessionSeed: `${state.prompt}-title-${Date.now()}`,
          previousHooks: [state.title, state.hook].filter(Boolean),
          language: state.language,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data?.error || 'Title regeneration failed'))

      const nextTitle = String(data.title ?? '').trim()
      if (!nextTitle) throw new Error('Title regeneration returned empty result')

      set({
        title: nextTitle,
      })
      persistSession(get())
    } catch {
      /* title regen is non-blocking */
    } finally {
      set({ isRegeneratingTitle: false })
    }
  },

  regenerateScript: async () => {
    const state = get()
    if (!state.prompt.trim() || state.isRegeneratingScript || state.isGenerating) return

    set({
      isRegeneratingScript: true,
      activeStageTab: 'script',
      stageTabPinned: true,
    })

    try {
      const { res, data } = await pipelineFetchJson('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.prompt,
          prompt: state.prompt,
          tone: state.style,
          duration: state.duration,
          sessionSeed: `${state.prompt}-script-${Date.now()}`,
          language: state.language,
          title: state.title,
          hook: state.hook,
          niche: state.niche,
          visualStyle: state.visualStyle ?? undefined,
          transcript: state.originalTranscript?.trim() || undefined,
          regenFresh: true,
          previousScript: state.script?.trim() || undefined,
          previousHook: state.hook?.trim() || undefined,
          creatorMemoryBias: getCreatorMemoryBiasHints(),
          researchDocument: state.researchDocument ?? undefined,
          skipResearch: true,
          skipStoryboard: true,
        }),
        maxRetries: 1,
        timeoutMs: SCRIPT_GENERATION_TIMEOUT_MS,
      })
      if (!res.ok) throw new Error(String(data?.error || 'Script regeneration failed'))

      const output = data.output as Record<string, unknown> | undefined
      const applied = applyScriptOutput(output, state.hook)
      if (!applied.script.trim()) throw new Error('Script regeneration returned empty result')

      set({
        script: applied.script,
        scriptBeats: applied.scriptBeats,
        payoff: applied.payoff,
        cta: applied.cta,
        viralScript: state.viralScript
          ? { ...state.viralScript, script: applied.script }
          : state.viralScript,
      })
      persistSession(get())
    } catch {
      /* script regen is non-blocking */
    } finally {
      set({ isRegeneratingScript: false })
    }
  },

  selectHookVersion: (versionId) => {
    const state = get()
    const history = applyHookVersionSelection(state.variationHistory, versionId)
    const version = history.hooks.find((h) => h.id === versionId)
    if (!version) return
    set({ variationHistory: history, hook: version.text })
    persistSession(get())
  },

  selectStoryboardVersion: (versionId) => {
    const state = get()
    const history = applyStoryboardVersionSelection(state.variationHistory, versionId)
    const version = history.storyboards.find((s) => s.id === versionId)
    if (!version) return
    const scenes = state.scenes.map((scene) =>
      scene.id === version.sceneId ? { ...scene, imageUrl: version.imageUrl } : scene
    )
    set({ variationHistory: history, scenes, storyboard: scenes })
    persistSession(get())
  },

  markProjectExported: async () => {
    const { savedProjectId } = get()
    if (!savedProjectId) return
    try {
      await updateProject(savedProjectId, { status: exportedStatus() })
      streakRecordExportCompleted()
    } catch {
      /* non-blocking */
    }
  },

  retryVideoRender: async () => {
    const state = get()
    if (state.videoUrl || state.scenes.length < 1 || state.isGenerating || state.isRenderingVideo) {
      return
    }

    if (!state.videoRenderEnabled) {
      set({ renderError: null, exportPackageReady: false })
      try {
        await simulateMockExport((label) => set({ renderStatusLabel: label }))
        set({ exportPackageReady: true, renderError: null })
        persistSession(get())
      } catch (mockErr) {
        set({
          exportPackageReady: false,
          renderError:
            mockErr instanceof Error ? mockErr.message : 'Storyboard export packaging failed',
        })
      }
      return
    }

    set({ renderError: null, isRenderingVideo: true, exportExpired: false })

    try {
      try {
        await ensureProjectArchived(get())
      } catch (err) {
        useQuickCutGenerationStore.setState({
          saveState: 'error',
          saveError: resolveSaveError(err),
        })
      }

      const { renderRes, renderData } = await requestVideoRender(get(), true)
      if (!renderRes.ok) {
        set({ renderError: String(renderData?.error || 'Video render unavailable') })
        return
      }

      if (typeof renderData.videoUrl === 'string' && renderData.videoUrl) {
        set({
          videoUrl: renderData.videoUrl,
          renderPollUrl: null,
          renderError: null,
          exportExpired: false,
          generationStep: 'complete',
        })
        persistSession(get())
        return
      }

      if (typeof renderData.pollUrl === 'string') {
        set({ renderPollUrl: renderData.pollUrl, renderError: null, exportExpired: false })
        await get().resumeRenderPoll()
        return
      }

      const sync = await requestVideoRender(state, false)
      if (sync.renderRes.ok && typeof sync.renderData.videoUrl === 'string') {
        set({
          videoUrl: sync.renderData.videoUrl,
          renderPollUrl: null,
          renderError: null,
          generationStep: 'complete',
        })
        persistSession(get())
        return
      }

      set({
        renderError: String(sync.renderData?.error || 'Video render unavailable'),
        generationStep: 'render',
      })
    } catch (err) {
      set({
        renderError: err instanceof Error ? err.message : 'Video render unavailable',
        generationStep: 'render',
      })
    } finally {
      set({ isRenderingVideo: false })
    }
  },

  syncVideoRenderConfig: async () => {
    try {
      const res = await fetch('/api/quick-cut/config')
      const config = (await res.json().catch(() => ({}))) as Record<string, boolean>
      set({ videoRenderEnabled: config.videoRenderEnabled === true })
    } catch {
      /* non-blocking */
    }
  },

  resumeRenderPoll: async () => {
    const { renderPollUrl, videoUrl, videoRenderEnabled, isRenderingVideo, savedProjectId } = get()
    if (!videoRenderEnabled || !renderPollUrl || videoUrl || isRenderingVideo) return

    set({ isRenderingVideo: true })
    try {
      const url = await pollRenderJob(
        renderPollUrl,
        (patch) => {
          if (patch.label) set({ renderStatusLabel: patch.label })
          if (patch.videoUrl) {
            set({ videoUrl: patch.videoUrl, renderPollUrl: null, renderError: null })
          }
        },
        240,
        savedProjectId
      )
      set({
        videoUrl: url,
        renderPollUrl: null,
        renderError: null,
        exportExpired: false,
        generationStep: 'complete',
      })
      persistSession(get())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video render timed out'
      if (message.includes('Export job expired') && savedProjectId) {
        const { fetchProjectReelDownload, EXPORT_EXPIRED_MSG } = await import(
          '@/lib/quick-cut/asset-availability'
        )
        const recovered = await fetchProjectReelDownload(savedProjectId)
        if (recovered.reelUrl) {
          set({
            videoUrl: recovered.reelUrl,
            renderPollUrl: null,
            renderError: null,
            exportExpired: false,
            generationStep: 'complete',
          })
          persistSession(get())
          return
        }
        set({
          videoUrl: null,
          renderError: EXPORT_EXPIRED_MSG,
          renderPollUrl: null,
          exportExpired: true,
          generationStep: 'render',
        })
        persistSession(get())
        return
      }
      set({
        renderError: message,
        renderPollUrl: null,
        generationStep: 'render',
      })
      persistSession(get())
    } finally {
      set({ isRenderingVideo: false })
    }
  },

  loadSavedProject: async (projectId, options) => {
    const state = get()
    if (state.isGenerating) return false

    if (
      state.savedProjectId === projectId &&
      state.studioReviewMode &&
      state.scenes.length > 0
    ) {
      if (options?.stageTab) {
        set({ activeStageTab: options.stageTab, stageTabPinned: true })
      }
      return true
    }

    try {
      const row = await loadProject(projectId)
      if (inferProjectMode(row) === 'director') return false

      const patch = buildQuickCutHydrationFromRow(row, options?.stageTab)
      set({
        ...INITIAL,
        ...patch,
        saveState: 'idle',
        saveError: null,
      })
      persistHookSession(get())
      void get().syncVideoRenderConfig()
      return true
    } catch {
      return false
    }
  },

  saveProject: async () => {
    const state = get()
    if (state.saveState === 'saving') return state.savedProjectId
    if (!state.script && state.scenes.length < 1) return null

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      set({ saveState: 'error', saveError: 'Sign in to save' })
      return null
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      set({ saveState: 'error', saveError: 'Sign in to save' })
      return null
    }

    set({ saveState: 'saving', saveError: null })
    try {
      const id = await archiveQuickCutProject(get())
      return id
    } catch (err) {
      set({ saveState: 'error', saveError: resolveSaveError(err) })
      return null
    }
  },
}))
