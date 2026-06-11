'use client'

import { create } from 'zustand'
import { QUICK_CUT_V2_TEXT_TO_VIDEO } from '@/lib/quick-cut/quick-cut-v2-config'
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
import {
  loadCreatorLanguageSession,
  sessionLanguageMixed,
} from '@/lib/i18n/creator-language-session'
import {
  DEFAULT_DIRECTOR_MODE,
  loadDirectorModePreference,
  normalizeDirectorMode,
  type DirectorMode,
} from '@/lib/cinematic/director-modes'
import {
  creatorBlueprintById,
  normalizeCreatorBlueprintId,
} from '@/lib/cinematic/creator-blueprints'
import type { ViralScript, VisualStyle } from '@/lib/cinematic/workflow-state'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { ScriptArchetypeId } from '@/lib/cinematic/script-archetypes'
import {
  loadRecentContentAngles,
  normalizeContentAngleId,
  recordContentAngleInSession,
} from '@/lib/cinematic/content-angle-engine'
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
  getCinematicProjectsMigrationHint,
  isCinematicProjectsUnavailable,
  updateProject,
  type ArchiveGeneratedProjectInput,
  type CinematicProjectPatch,
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
import type {
  RepurposedAssetEntry,
  RepurposedAssetsMap,
  RepurposeOutputType,
} from '@/lib/cinematic/content-repurpose'
import type { ContentSeries } from '@/lib/cinematic/content-series'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { simulateMockExport } from '@/lib/cinematic/quick-cut/mock-export.client'
import { friendlyReelRenderError } from '@/lib/video/reel-render-errors'
import { sceneExportReadiness, reelExportReadiness } from '@/lib/export/scene-export-validation'
import {
  pickExportStoryboardScenes,
  scenesToExportRequestPayload,
} from '@/lib/export/export-request-payload.client'
import { exportPayloadTrace } from '@/lib/export/export-log.client'
import {
  pollSceneVideoJobs,
  queueSceneVideos,
} from '@/lib/cinematic/scene-video-pipeline.client'
import { REEL_EXPORT_PROGRESS_CAP } from '@/lib/reels/export-poll.client'
import type { QuickCutPipelineStatus } from '@/lib/cinematic/quick-cut/pipeline-status'
import { buildEmotionalPreviewRhythm, mergePreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
import {
  clearHookSession,
  loadHookSession,
  saveHookSession,
} from '@/lib/cinematic/quick-cut/hook-session'
import {
  inferActiveWorkflowStep,
  inferCompletedWorkflowSteps,
} from '@/lib/workflow/workflow-continuity'
import {
  clearWorkflowSession,
  loadWorkflowSession,
  saveWorkflowSession,
} from '@/lib/workflow/workflow-session'
import {
  buildResumeHref,
  inferLastGeneratedAsset,
  saveProjectContinuity,
} from '@/lib/trust/project-continuity'
import { logPipelineActivity } from '@/lib/trust/activity-events'
import {
  workflowStepFromGenerationStep,
  type WorkflowStepId,
} from '@/lib/workflow/workflow-step-map'
import { regenerateHook as requestHookRegen } from '@/lib/cinematic/refinement-client'
import {
  generationStepToTab,
  type QuickCutStageTab,
} from '@/lib/cinematic/quick-cut/stage-tabs'
import { buildQuickCutHydrationFromRow } from '@/lib/cinematic/quick-cut/project-hydration'
import {
  buildThumbnailCoverScene,
  resolveActiveThumbnailUrl,
  THUMBNAIL_COVER_SCENE_ID,
} from '@/lib/cinematic/thumbnail-cover'
import {
  reorderSceneIds,
  reorderScenesByIds,
} from '@/lib/cinematic/quick-cut/reorder-scenes'
import {
  buildTimelineFromQuickCutStore,
  timelineJsonFromProject,
} from '@/types/timeline'
import { loadProject } from '@/lib/cinematic-projects'
import { inferProjectMode } from '@/lib/cinematic/project-mode'
import {
  streakRecordExportCompleted,
  streakRecordWorkflowCreated,
} from '@/lib/creator/creator-streak-events'
import {
  getCreatorMemoryBiasHints,
  getEffectiveCreatorProfile,
  rememberCreativeSession,
  fetchCreatorMemoryProfile,
  getCachedCreatorMemoryProfile,
  hasCreatorProfileContent,
  type CreatorMemoryProfile,
  type CreatorProfileOverride,
} from '@/lib/creator/creator-memory'
import { useCompanionStore } from '@/stores/companion-store'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'
import {
  logExportSuccess,
  logHookAccept,
  logHookRegen,
  logProjectSave,
  logScriptRegen,
} from '@/lib/memory/learning-loop'
import { logWorkflowCompleteClient } from '@/lib/memory/workflow-learning'
import { useContentQualityStore } from '@/stores/content-quality-store'
import type { ContentBrief } from '@/lib/content-director/content-brief'
import { generateRulesContentBriefSync } from '@/lib/content-director/rules-content-brief'
import { generateRulesCreativeDirectorBriefSync } from '@/lib/content-director/creative-director-brief'
import { applyStyleTemplate as applyStyleTemplateFields } from '@/lib/templates/style-templates'
import {
  EMPTY_V3_PIPELINE_STATE,
  syncV3StateFromContext,
  runV3Stage as executeV3Stage,
  type V3PipelineContext,
  type V3PipelineStageId,
} from '@/lib/pipeline/v3-cinematic-pipeline'
import type {
  CreativeDirectorBrief,
  V3PipelineState,
  VisualBible,
} from '@/lib/pipeline/v3-types'
import { isV3PipelineEnabledFromConfig } from '@/lib/pipeline/v3-feature-flag'
import {
  formatFinalHook,
  resolveHookAfterScript,
} from '@/lib/cinematic/hook-format'
import { alignOutputToBrief } from '@/lib/content-director/align-output'
import {
  logParsedIntent,
  parseCreatorIntentSync,
  serializeParsedIntent,
  type ParsedCreatorIntent,
} from '@/lib/input-understanding'
import {
  validateTitleHookBundle,
} from '@/lib/quality/output-validator'
import {
  createHookProgressController,
  type HookProgressPhase,
} from '@/lib/cinematic/hook-generation-progress'
import {
  loadRecentNarrativeFrameworks,
  recordNarrativeFrameworkUsage,
  type NarrativeFrameworkId,
} from '@/lib/narrative/narrative-frameworks'
import { creatorHistoryPayload } from '@/lib/creator/knowledge-base'
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
  logGenerationError,
  logGenerationRecoverable,
  logGenerationResumed,
  logGenerationStart,
  logGenerationSuccess,
  logPipelineStepStart,
  logStepFailed,
  logStoryboardFrame,
} from '@/lib/cinematic/generation-logger'
import {
  armPipelineWatchdog,
  clearPipelineWatchdog,
  logStateTransition,
  logStepFailure,
  logStepShouldRunDecision,
  logTraceEnter,
  logTraceExit,
  runTracedStep,
  shouldTracePipeline,
} from '@/lib/pipeline/pipeline-trace'
import { withStepTimeout } from '@/lib/pipeline/with-step-timeout'
import {
  pipelineFetch,
  pipelineFetchJson,
  DEEP_RESEARCH_TIMEOUT_MS,
  SCRIPT_GENERATION_TIMEOUT_MS,
} from '@/lib/cinematic/generation-pipeline-fetch'
import { toUserGenerationError } from '@/lib/cinematic/generation-errors'
import { fetchQuickCutConfig } from '@/lib/quick-cut/quick-cut-config-cache.client'
import {
  defaultClientVideoRenderEnabled,
  isClientVideoRenderEnabled,
} from '@/lib/cinematic/quick-cut/video-render-enabled.client'
import { PlanLimitError } from '@/lib/cinematic/generation-pipeline-fetch'
import {
  blockMp4CompileIfNeeded,
  fetchProfilePlanSnapshot,
} from '@/lib/export/mp4-compile-guard.client'
import { showPlanLimitToast, handlePlanLimitResponse } from '@/lib/usage/plan-limit-toast.client'
import { toast } from 'sonner'
import { handleImageGenerationUnavailableResponse } from '@/lib/cinematic/image-generation-unavailable.client'
import { ImageGenerationUnavailableError } from '@/lib/ai/image-provider-errors'
import {
  persistGenerationFailed,
  persistStepComplete,
} from '@/lib/cinematic/generation-persist'
import { AnalyticsEvents } from '@/lib/analytics/events'
import {
  trackError,
  trackEvent,
  trackFirstGenerationCompleted,
  trackFirstGenerationStarted,
  trackFirstProjectCreated,
} from '@/lib/analytics/track-event'
import {
  trackExportCompletedAfterCompanion,
  trackStoryGeneratedAfterCompanion,
} from '@/lib/companion/analytics'
import { markFirstGeneration } from '@/lib/onboarding/onboarding-state'
import {
  deriveScriptText,
  narrationFromCinematicScript,
  resolveCinematicScript,
} from '@/lib/cinematic/cinematic-script'
import type { CinematicGenerationState } from '@/lib/cinematic/quick-cut/cinematic-assembly-timing'
import { runCinematicAssemblyPresentation } from '@/lib/cinematic/quick-cut/run-cinematic-assembly'
import {
  buildStoryBibleFromVisualDirection,
  mergeStoryBible,
  type StoryBible,
} from '@/lib/cinematic/story-bible'
import {
  assignSceneMotion,
  applySceneMotionToScenes,
  isMotionPresetId,
  parseSceneMotionMap,
  type MotionPresetId,
  type SceneMotionMap,
} from '@/lib/motion/motion-presets'
import {
  applyBlueprintsToScenes,
  buildBlueprintsForScenes,
  DEFAULT_OUTPUT_ALIGNMENT_CONTROLS,
  parseOutputAlignmentControls,
  parseSceneBlueprints,
  type OutputAlignmentControls,
  type SceneBlueprint,
} from '@/lib/cinematic/scene-blueprint'
import {
  composeReelTimeline,
  patchReelTimelineClip,
  reelTimelineToSceneDurations,
  timelineStateFromReelTimeline,
  type ReelTimeline,
  type ReelTimelineEditPatch,
} from '@/lib/reel'
import { genPerf } from '@/lib/cinematic/generation-perf'
import {
  resetSectionStatus,
  type SectionId,
  type SectionStatusMap,
} from '@/lib/cinematic/section-generation-status'
import { recordStageDuration } from '@/lib/generation/generation-stage-timing.client'
import { generationStepToProgressStageId } from '@/lib/quick-cut/cinematic-generation-progress'
import {
  deriveReelPipelineState,
  type ReelPipelineFailedStage,
  type ReelPipelineStatus,
} from '@/lib/pipeline/reel-generation-orchestrator'
import {
  commitPipelineStage,
  completeMp4Pipeline,
  ensureGenerationJobsMigration,
  failPipeline,
  pipelineStageToStatus,
  renderMp4AndWait,
  resumeMp4FromGenerationJob,
  validateStageOrFail,
} from '@/lib/pipeline/reel-pipeline-runner.client'
import { pollGenerationJobOrchestrator } from '@/lib/pipeline/reel-generation-orchestrator.client'
import { canRegenerateSingleScene } from '@/lib/quick-cut/scene-regen-guard'
import { canEditTimeline } from '@/lib/quick-cut/timeline-edit-guard'
import {
  buildConsistencyInjectionBlock,
  buildConsistencyMemory,
} from '@/lib/creator/consistency-memory'
import type { SceneMotion } from '@/lib/motion/scene-motion-types'

export type { CinematicGenerationState }

let pipelineStartedAt = 0
let currentStageStartedAt = 0
let pipelineAbortRequested = false
let lastPipelineInvokeAt = 0
const PIPELINE_DEBOUNCE_MS = 800

class PipelineAbortedError extends Error {
  constructor() {
    super('Generation stopped')
    this.name = 'PipelineAbortedError'
  }
}

function throwIfPipelineAborted(): void {
  if (pipelineAbortRequested) throw new PipelineAbortedError()
}

function patchSectionStatus(
  set: (patch: Partial<QuickCutGenerationState>) => void,
  get: () => QuickCutGenerationState,
  section: SectionId,
  status: SectionStatusMap[SectionId]
) {
  set({ sectionStatus: { ...get().sectionStatus, [section]: status } })
}

export type QuickCutGenerationStep =
  | 'idle'
  | 'analyzing'
  | 'title'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'images'
  | 'motion'
  | 'voice'
  | 'render'
  | 'complete'
  | 'error'

export const STEP_PROGRESS: Record<QuickCutGenerationStep, number> = {
  idle: 0,
  analyzing: 5,
  title: 10,
  hook: 15,
  script: 30,
  scenes: 45,
  images: 58,
  motion: 68,
  voice: 75,
  render: 90,
  complete: 100,
  error: 0,
}

export const STEP_LABELS: Record<QuickCutGenerationStep, string> = {
  idle: '',
  analyzing: 'Mugtee is reading your audience brief…',
  title: 'Mugtee is discovering your story angle…',
  hook: 'Mugtee is crafting your scroll-stopping hook…',
  script: 'Mugtee is directing your next viral story.',
  scenes: 'Mugtee is building your scene breakdown…',
  images: 'Mugtee is generating cinematic visuals…',
  motion: 'Mugtee is applying cinematic motion…',
  voice: 'Mugtee is creating your voiceover…',
  render: 'Mugtee is rendering your reel…',
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
  /** Target distribution platform for script brief */
  platform?: string
  /** Explicit output language — defaults to English or saved preference */
  language?: ProjectLanguage
  /** AI Director Mode — creative direction for generation */
  directorMode?: DirectorMode
  /** Creator Project Template id selected on canvas */
  blueprintId?: string | null
  /** Per-project creator profile overrides (project settings win over global profile) */
  creatorProfileOverride?: CreatorProfileOverride
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
  characterDescription: string
  scenes: GeneratedScene[]
  storyboard: GeneratedScene[]
  regeneratingSceneIds: string[]
  /** Dedicated cover image — persisted as thumbnail_url */
  thumbnailImageUrl: string | null
  /** Bumped on each thumbnail regen so the UI reloads the image. */
  thumbnailDisplayBust: number
  isRegeneratingThumbnail: boolean
  directingSceneLabel: string | null
  voiceUrl: string | null
  elevenLabsVoiceId: string | null
  voiceName: string | null
  voiceProfileId: string | null
  voiceMetadata: import('@/lib/voice/generateVoice').VoiceMetadata | null
  isRegeneratingVoice: boolean
  voiceFallbackMessage: string | null
  waveform: number[]
  progress: number
  eta: number
  videoUrl: string | null
  renderPollUrl: string | null
  renderError: string | null
  renderStatusLabel: string | null
  isRenderingVideo: boolean
  /** When server-side MP4 export poll started (for stuck >3min UI). */
  renderStartedAt: number | null
  /** Pipeline click timestamp — for completion timing UI (Phase 1). */
  generationStartedAt: number | null
  /** Timestamp when the active pipeline step began (for ETA). */
  currentStageStartedAt: number | null
  /** When core generation finished and export phase began. */
  generationCoreCompletedAt: number | null
  /** When MP4 URL became available. */
  exportCompletedAt: number | null
  exportPackageReady: boolean
  /** Phase 4 orchestrator — canonical pipeline status (see reel-generation-orchestrator.ts). */
  pipelineStatus: ReelPipelineStatus
  pipelineJobId: string | null
  failedPipelineStage: ReelPipelineFailedStage | null
  /** MP4 URL missing or download failed — user must re-export. */
  exportExpired: boolean
  videoRenderEnabled: boolean
  /** Seedance scene clip generation — distinct from final MP4 compile */
  sceneVideoEnabled: boolean
  isGeneratingSceneVideos: boolean
  virlo: VirloMetadata | null
  language: ProjectLanguage
  directorMode: DirectorMode
  blueprintId: string | null
  styleTemplateId: string | null
  niche: CinematicNiche
  style: string
  duration: number
  visualStyle: VisualStyle | null
  storyBible: StoryBible | null
  sceneMotion: SceneMotionMap
  /** Scene → visual blueprint (script/image/motion alignment) */
  sceneBlueprints: SceneBlueprint[]
  /** Synchronized ready-to-edit reel timeline (voice/visual/caption) */
  reelTimeline: ReelTimeline | null
  outputAlignmentControls: OutputAlignmentControls
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
  /** Global creator profile loaded at pipeline start */
  creatorProfile: CreatorMemoryProfile | null
  /** Optional per-project overrides — merged over creatorProfile for generation */
  creatorProfileOverride: CreatorProfileOverride | null
  repurposedAssets: RepurposedAssetsMap
  contentSeries: ContentSeries | null
  /** Session-only Content Director brief — aligns hook/script/visuals */
  contentBrief: ContentBrief | null
  /** Parsed creator intent — clean topic for generation */
  parsedIntent: ParsedCreatorIntent | null
  /** V3 multi-stage pipeline — feature-flagged via MUGTEE_V3_PIPELINE */
  v3PipelineEnabled: boolean
  v3PipelineState: V3PipelineState
  creativeDirectorBrief: CreativeDirectorBrief | null
  visualBible: VisualBible | null
  /** Recent titles this session — originality validation */
  recentTitles: string[]
  /** Per-output-card status for progressive UI */
  sectionStatus: SectionStatusMap
  /** Craft Hook staged progress (header + hook panel) */
  hookProgressPhase: HookProgressPhase
  hookProgressLabel: string | null
  /** Shown at ~2s before final validated hook lands */
  hookPreview: string | null
  /** Prevents duplicate pipeline starts from rapid clicks */
  generationInFlight: boolean
  /** Unified creator workflow timeline — current highlighted step */
  currentWorkflowStep: WorkflowStepId
  /** Mission steps marked complete this session */
  completedWorkflowSteps: WorkflowStepId[]
  /** Last timeline step the creator navigated to (restore on return) */
  lastVisitedStep: WorkflowStepId | null
}

export interface QuickCutGenerationState extends QuickCutGenerationStateBase, DeepResearchStoreFields, StoryboardStoreFields {}

export interface QuickCutGenerationActions {
  reset: (options?: { clearProject?: boolean }) => void
  setActiveStageTab: (tab: QuickCutStageTab, pinned?: boolean) => void
  followPipelineStage: () => void
  runPipeline: (input: QuickCutInput) => Promise<void>
  stopGeneration: () => Promise<void>
  resumeGeneration: () => Promise<void>
  regenerateHook: () => Promise<void>
  regenerateTitle: () => Promise<void>
  regenerateScript: () => Promise<void>
  regenerateSceneImage: (sceneId: string) => Promise<void>
  restoreSceneImageUrl: (sceneId: string, imageUrl: string) => void
  regenerateMissingSceneImages: () => Promise<void>
  regenerateThumbnailImage: () => Promise<void>
  updateSceneImagePrompt: (sceneId: string, imagePrompt: string) => Promise<void>
  generateSceneVariations: (sceneId: string) => Promise<void>
  reorderScenes: (activeId: string, overId: string) => void
  selectHookVersion: (versionId: string) => void
  selectStoryboardVersion: (versionId: string) => void
  markProjectExported: () => Promise<void>
  retryVideoRender: () => Promise<void>
  resumeRenderPoll: () => Promise<void>
  /** Refresh server video-render flag (VIDEO_RENDER_ENABLED) for export/compile UI. */
  syncVideoRenderConfig: () => Promise<void>
  saveProject: () => Promise<string | null>
  setCreatorBlueprint: (blueprintId: string | null) => void
  applyStyleTemplate: (templateId: string) => void
  setStyleTemplateId: (templateId: string | null) => void
  loadSavedProject: (
    projectId: string,
    options?: { stageTab?: QuickCutStageTab }
  ) => Promise<boolean>
  setRepurposedAsset: (type: RepurposeOutputType, entry: RepurposedAssetEntry) => void
  setSelectedElevenLabsVoice: (voiceId: string, name: string) => void
  ensureRecommendedElevenLabsVoice: () => Promise<void>
  regenerateVoice: () => Promise<void>
  setCreatorProfileOverride: (override: CreatorProfileOverride | null) => void
  setContentSeries: (series: ContentSeries | null) => void
  persistContentSeries: (series: ContentSeries) => Promise<void>
  setStoryBible: (bible: StoryBible | null) => void
  updateStoryBible: (patch: Partial<StoryBible>) => void
  setSceneMotionPreset: (sceneId: string, presetId: MotionPresetId) => void
  updateSceneMotion: (sceneId: string, patch: Partial<SceneMotion>) => void
  setOutputAlignmentControls: (patch: Partial<OutputAlignmentControls>) => void
  refreshSceneBlueprints: () => void
  composeReelTimeline: () => void
  updateReelTimelineClip: (sceneId: string, patch: ReelTimelineEditPatch) => void
  setCurrentWorkflowStep: (step: WorkflowStepId) => void
  markWorkflowStepComplete: (step: WorkflowStepId) => void
  syncWorkflowFromPipeline: () => void
  /** Sync V3 pipeline artifacts from current store snapshot */
  syncV3PipelineState: () => void
  /** Derive + persist Phase 4 pipeline status from current store snapshot. */
  syncPipelineOrchestrator: () => void
  /** Run a single V3 stage (when MUGTEE_V3_PIPELINE=true) */
  runV3Stage: (stage: V3PipelineStageId) => Promise<void>
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
  scriptArchetypeId: null,
  scriptArchetypeLabel: null,
  scriptArchetypeDisplay: null,
  narrativeArchetype: null,
  narrativeArchetypeLabel: null,
  narrativeStructureLabels: null,
  narrativeFlowDisplay: null,
  contentAngleId: null,
  contentAngleLabel: null,
  hookFramework: null,
  hookFrameworkLabel: null,
  scenes: [],
  storyboard: [],
  characterDescription: '',
  directingSceneLabel: null,
  regeneratingSceneIds: [],
  thumbnailImageUrl: null,
  thumbnailDisplayBust: 0,
  isRegeneratingThumbnail: false,
  voiceUrl: null,
  elevenLabsVoiceId: null,
  voiceName: null,
  voiceProfileId: null,
  voiceMetadata: null,
  isRegeneratingVoice: false,
  voiceFallbackMessage: null,
  waveform: [],
  progress: 0,
  eta: 0,
  videoUrl: null,
  renderPollUrl: null,
  renderError: null,
  renderStatusLabel: null,
  isRenderingVideo: false,
  renderStartedAt: null,
  generationStartedAt: null,
  currentStageStartedAt: null,
  generationCoreCompletedAt: null,
  exportCompletedAt: null,
  exportPackageReady: false,
  pipelineStatus: 'queued',
  pipelineJobId: null,
  failedPipelineStage: null,
  exportExpired: false,
  videoRenderEnabled: defaultClientVideoRenderEnabled(),
  sceneVideoEnabled: false,
  isGeneratingSceneVideos: false,
  virlo: null,
  language: 'en',
  directorMode: DEFAULT_DIRECTOR_MODE,
  blueprintId: null,
  styleTemplateId: null,
  niche: 'storytelling',
  style: 'cinematic',
  duration: 60,
  visualStyle: null,
  storyBible: null,
  sceneMotion: {},
  sceneBlueprints: [],
  reelTimeline: null,
  outputAlignmentControls: { ...DEFAULT_OUTPUT_ALIGNMENT_CONTROLS },
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
  creatorProfile: null,
  creatorProfileOverride: null,
  repurposedAssets: {},
  contentSeries: null,
  contentBrief: null,
  parsedIntent: null,
  v3PipelineEnabled: false,
  v3PipelineState: { ...EMPTY_V3_PIPELINE_STATE },
  creativeDirectorBrief: null,
  visualBible: null,
  recentTitles: [],
  sectionStatus: resetSectionStatus(),
  hookProgressPhase: 'idle',
  hookProgressLabel: null,
  hookPreview: null,
  generationInFlight: false,
  currentWorkflowStep: 'analyze',
  completedWorkflowSteps: [],
  lastVisitedStep: null,
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

function resolveCreatorProfilePayload(
  state: Pick<QuickCutGenerationState, 'creatorProfile' | 'creatorProfileOverride'>
): CreatorMemoryProfile | undefined {
  return getEffectiveCreatorProfile(
    state.creatorProfile,
    state.creatorProfileOverride
  ) ?? undefined
}

function resolveMemoryProfilePayload() {
  const profile = useCreatorMemoryStore.getState().profile
  if (
    profile.relationshipScore > 0 ||
    Object.values(profile.creatorDna).some(Boolean) ||
    (profile.learningEvents?.length ?? 0) > 0
  ) {
    return profile
  }
  return undefined
}

function contentBriefApiPayload(
  state: Pick<
    QuickCutGenerationState,
    'prompt' | 'style' | 'duration' | 'niche' | 'language' | 'directorMode' | 'parsedIntent'
  >,
  platform?: string
) {
  return {
    topic: state.prompt,
    parsedIntent: state.parsedIntent ? serializeParsedIntent(state.parsedIntent) : undefined,
    platform,
    tone: state.style,
    duration: state.duration,
    niche: state.parsedIntent?.niche ?? state.niche,
    language: state.language,
    directorMode: state.directorMode,
    creativeBrief: useCompanionStore.getState().creativeBrief,
  }
}

function recordRecentTitle(titles: string[], next: string): string[] {
  const trimmed = next.trim()
  if (!trimmed) return titles
  const filtered = titles.filter((t) => t.trim().toLowerCase() !== trimmed.toLowerCase())
  return [trimmed, ...filtered].slice(0, 8)
}

async function fetchValidatedTitleHook(
  payload: Record<string, unknown>,
  rawInput: string,
  recentTitles: readonly string[],
  onProgress?: ReturnType<typeof createHookProgressController>
): Promise<{ title: string; hook: string; data: Record<string, unknown> }> {
  const { res, data } = await pipelineFetchJson<Record<string, unknown>>(
    '/api/generate-title',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      maxRetries: 0,
    }
  )
  if (!res.ok) {
    throw new Error(String(data?.error || 'Title generation failed'))
  }
  const title = String(data.title ?? '')
  const hook = String(data.hook ?? '')

  onProgress?.markCandidate(hook, title)

  const validation = validateTitleHookBundle(title, hook, rawInput, recentTitles)
  if (!validation.ok) {
    genPerf.log('hook', 'client validation soft-fail — using server result', {
      issues: validation.issues,
    })
  }

  onProgress?.markValidated(hook, title)
  return { title, hook, data }
}

function parseContentAngleFromResponse(data?: Record<string, unknown> | null): {
  contentAngleId: string | null
  contentAngleLabel: string | null
  hookFramework: string | null
  hookFrameworkLabel: string | null
} {
  return {
    contentAngleId:
      typeof data?.contentAngleId === 'string' ? data.contentAngleId : null,
    contentAngleLabel:
      typeof data?.contentAngleLabel === 'string' ? data.contentAngleLabel : null,
    hookFramework:
      typeof data?.hookFramework === 'string' ? data.hookFramework : null,
    hookFrameworkLabel:
      typeof data?.hookFrameworkLabel === 'string' ? data.hookFrameworkLabel : null,
  }
}

function parseScriptArchetypeFromOutput(output?: Record<string, unknown> | null): {
  scriptArchetypeId: string | null
  scriptArchetypeLabel: string | null
  scriptArchetypeDisplay: string | null
  narrativeArchetype: string | null
  narrativeArchetypeLabel: string | null
  narrativeStructureLabels: string[] | null
  narrativeFlowDisplay: string | null
} {
  const narrativeArchetype =
    typeof output?.narrativeArchetype === 'string'
      ? output.narrativeArchetype
      : typeof output?.archetypeId === 'string'
        ? output.archetypeId
        : null
  const narrativeArchetypeLabel =
    typeof output?.narrativeArchetypeLabel === 'string'
      ? output.narrativeArchetypeLabel
      : typeof output?.archetypeLabel === 'string'
        ? output.archetypeLabel
        : null
  const narrativeStructureLabels = Array.isArray(output?.narrativeStructureLabels)
    ? output.narrativeStructureLabels.filter(
        (l): l is string => typeof l === 'string' && l.trim().length > 0
      )
    : null
  const narrativeFlowDisplay =
    typeof output?.narrativeFlowDisplay === 'string' ? output.narrativeFlowDisplay : null

  return {
    scriptArchetypeId: narrativeArchetype,
    scriptArchetypeLabel: narrativeArchetypeLabel,
    scriptArchetypeDisplay:
      typeof output?.archetypeDisplay === 'string' ? output.archetypeDisplay : null,
    narrativeArchetype,
    narrativeArchetypeLabel,
    narrativeStructureLabels,
    narrativeFlowDisplay,
  }
}

function applyScriptOutput(
  output: Record<string, unknown> | undefined,
  hook: string
): {
  script: string
  scriptBeats: ScriptBeat[]
  payoff: string
  cta: string
  hook: string
} {
  const scriptText = typeof output?.script === 'string' ? output.script : ''
  const outputHook = typeof output?.hook === 'string' ? output.hook : ''
  const normalizedHook = resolveHookAfterScript({
    titleHook: hook,
    outputHook,
    script: scriptText,
  })
  const cinematic = resolveCinematicScript({
    scriptBeats: output?.scriptBeats as ScriptBeat[] | undefined,
    script: scriptText,
    hook: normalizedHook,
    payoff: typeof output?.payoff === 'string' ? output.payoff : '',
    cta: typeof output?.cta === 'string' ? output.cta : '',
  })
  return {
    script: deriveScriptText(cinematic),
    scriptBeats: cinematic.scriptBeats,
    payoff: cinematic.payoff,
    cta: cinematic.cta,
    hook: formatFinalHook(cinematic.hook || normalizedHook),
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
      ...(s.imageAssetPath?.trim() ? { imageAssetPath: s.imageAssetPath.trim() } : {}),
      ...(s.storyboardImages?.length
        ? {
            storyboardImages: s.storyboardImages,
            activeStoryboardId: s.activeStoryboardId,
          }
        : {}),
    })),
    captions: state.script.split('\n').filter(Boolean).slice(0, 8),
    captionPack: {
      primary: state.hook,
      cta: state.cta || 'Save this for later.',
      hashtags: ['#cinematic', '#storytelling', '#faceless'],
    },
    suggestedVoiceStyle: 'warm_documentary',
    niche: state.niche,
    ...(state.scriptArchetypeId
      ? {
          archetypeId: state.scriptArchetypeId as ScriptArchetypeId,
          archetypeLabel: state.scriptArchetypeLabel ?? undefined,
          archetypeDisplay: state.scriptArchetypeDisplay ?? undefined,
          narrativeArchetype: state.narrativeArchetype ?? state.scriptArchetypeId ?? undefined,
          narrativeArchetypeLabel:
            state.narrativeArchetypeLabel ?? state.scriptArchetypeLabel ?? undefined,
          narrativeStructureLabels: state.narrativeStructureLabels ?? undefined,
          narrativeFlowDisplay: state.narrativeFlowDisplay ?? undefined,
        }
      : {}),
    ...(state.contentAngleId
      ? {
          contentAngleId: state.contentAngleId,
          contentAngleLabel: state.contentAngleLabel ?? undefined,
          hookFramework: state.hookFramework ?? undefined,
          hookFrameworkLabel: state.hookFrameworkLabel ?? undefined,
        }
      : {}),
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
    state.thumbnailImageUrl?.trim() ??
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
          style: state.voiceProfileId || 'warm_documentary',
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
          metadata: state.voiceMetadata ?? undefined,
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
    directorMode: state.directorMode,
    blueprintId: state.blueprintId ?? undefined,
    styleTemplateId: state.styleTemplateId ?? undefined,
    archetypeId: state.scriptArchetypeId ?? undefined,
    archetypeLabel: state.scriptArchetypeLabel ?? undefined,
    archetypeDisplay: state.scriptArchetypeDisplay ?? undefined,
    narrativeArchetype: state.narrativeArchetype ?? state.scriptArchetypeId ?? undefined,
    narrativeArchetypeLabel:
      state.narrativeArchetypeLabel ?? state.scriptArchetypeLabel ?? undefined,
    narrativeStructureLabels: state.narrativeStructureLabels ?? undefined,
    narrativeFlowDisplay: state.narrativeFlowDisplay ?? undefined,
    contentAngleId: state.contentAngleId ?? undefined,
    contentAngleLabel: state.contentAngleLabel ?? undefined,
    hookFramework: state.hookFramework ?? undefined,
    hookFrameworkLabel: state.hookFrameworkLabel ?? undefined,
    input_type: state.inputType,
    original_transcript: state.originalTranscript || state.prompt,
    variation_history: state.variationHistory,
    visual_style: state.visualStyle,
    story_bible: state.storyBible,
    scene_motion: state.sceneMotion,
    viral_script: state.viralScript,
    generation_status: state.generationStatus,
    generation_step: state.lastCompletedStep ?? undefined,
    last_completed_step: state.lastCompletedStep,
    generation_error:
      state.generationStatus === 'failed' ? state.error : null,
    repurposedAssets: state.repurposedAssets,
    series: state.contentSeries ?? undefined,
    scene_blueprints: state.sceneBlueprints,
    output_alignment_controls: state.outputAlignmentControls,
    timeline_state: timelineStateFromReelTimeline(state.reelTimeline),
    timeline_json: timelineJsonFromProject(
      buildTimelineFromQuickCutStore({
        savedProjectId: state.savedProjectId,
        title: state.title,
        scenes: state.scenes,
        voiceUrl: state.voiceUrl,
        voiceMetadata: state.voiceMetadata,
        script: state.script,
        duration: state.duration,
        sceneMotion: state.sceneMotion,
        sceneBlueprints: state.sceneBlueprints,
        outputAlignmentControls: state.outputAlignmentControls,
        reelTimeline: state.reelTimeline,
      })
    ),
  }
}

function buildReelTimelineFromState(state: QuickCutGenerationState): ReelTimeline | null {
  if (state.scenes.length < 1) return null
  return composeReelTimeline({
    scenes: state.scenes,
    sceneBlueprints: state.sceneBlueprints,
    sceneMotion: state.sceneMotion,
    outputAlignmentControls: state.outputAlignmentControls,
    voiceUrl: state.voiceUrl,
    voiceMetadata: state.voiceMetadata,
    script: state.script,
    targetDurationSec: state.duration,
  })
}

async function runSceneVideoGeneration(
  get: () => QuickCutGenerationState & QuickCutGenerationActions,
  set: typeof useQuickCutGenerationStore.setState
) {
  const requireVideos = get().videoRenderEnabled
  if (!get().sceneVideoEnabled && !requireVideos) return

  commitPipelineStage(get, set, 'video_generating', 'video')
  const state = get()
  const eligible = state.scenes.filter((s) => {
    const hasSource =
      Boolean(s.imageUrl?.trim()) ||
      (QUICK_CUT_V2_TEXT_TO_VIDEO &&
        Boolean(s.visualPrompt?.trim() || s.imagePrompt?.trim() || s.description?.trim()))
    return hasSource && !s.videoUrl?.trim() && s.videoGenerationStatus !== 'failed'
  })

  set({ isGeneratingSceneVideos: true, directingSceneLabel: 'Generating video clips…' })

  try {
    if (eligible.length >= 1) {
      const jobs = await queueSceneVideos({
        scenes: state.scenes,
        sceneBlueprints: state.sceneBlueprints,
        sceneMotion: state.sceneMotion,
        visualStyle: state.visualStyle,
        projectId: state.savedProjectId,
      })

      if (jobs.length >= 1) {
        useQuickCutGenerationStore.setState((prev) => {
          const scenes = prev.scenes.map((scene) =>
            jobs.some((j) => j.sceneId === scene.id)
              ? { ...scene, videoGenerationStatus: 'generating' as const }
              : scene
          )
          return { scenes, storyboard: scenes }
        })

        await pollSceneVideoJobs(
          jobs,
          (sceneId, patch) => {
            useQuickCutGenerationStore.setState((prev) => {
              const scenes = prev.scenes.map((scene) =>
                scene.id === sceneId ? { ...scene, ...patch } : scene
              )
              return { scenes, storyboard: scenes }
            })
            get().composeReelTimeline()
          },
          { projectId: state.savedProjectId }
        )
      }
    }

    get().composeReelTimeline()
    if (requireVideos && !validateStageOrFail(get, set, 'video')) {
      throw new Error(get().renderError ?? 'Scene video generation failed')
    }
    commitPipelineStage(get, set, 'video_complete', 'video')
  } catch (err) {
    if (requireVideos) {
      failPipeline(
        get,
        set,
        'video',
        err instanceof Error ? err.message : 'Scene video generation failed'
      )
      throw err
    }
  } finally {
    set({ isGeneratingSceneVideos: false, directingSceneLabel: null })
    get().composeReelTimeline()
  }
}

function persistReelTimelineQuiet(state: QuickCutGenerationState, timeline: ReelTimeline | null) {
  if (!state.savedProjectId || !timeline) return
  const timelineProject = buildTimelineFromQuickCutStore({
    savedProjectId: state.savedProjectId,
    title: state.title,
    scenes: state.scenes,
    voiceUrl: state.voiceUrl,
    voiceMetadata: state.voiceMetadata,
    script: state.script,
    duration: state.duration,
    sceneMotion: state.sceneMotion,
    sceneBlueprints: state.sceneBlueprints,
    outputAlignmentControls: state.outputAlignmentControls,
    reelTimeline: timeline,
  })
  void updateProject(state.savedProjectId, {
    timeline_state: timelineStateFromReelTimeline(timeline),
    timeline_json: timelineJsonFromProject(timelineProject),
    scenes: scenesToStore(
      state.scenes.map((scene) => {
        const dur = timeline.clips.find((c) => c.sceneId === scene.id)?.duration
        return dur != null ? { ...scene, duration: dur } : scene
      })
    ),
  } as import('@/lib/cinematic-projects').CinematicProjectPatch).catch(() => {})
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
  if (isCinematicProjectsUnavailable(err)) return getCinematicProjectsMigrationHint(err)
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
    contentAngleId: state.contentAngleId ?? undefined,
  }
}

function trackContentAngleFromResponse(data: Record<string, unknown>) {
  const parsed = parseContentAngleFromResponse(data)
  const angleId = normalizeContentAngleId(parsed.contentAngleId)
  if (angleId) recordContentAngleInSession(angleId)
  return parsed
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
      contentAngleId: state.contentAngleId ?? undefined,
    })
  } catch {
    const res = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: state.prompt,
        parsedIntent: state.parsedIntent
          ? serializeParsedIntent(state.parsedIntent)
          : serializeParsedIntent(parseCreatorIntentSync(state.prompt)),
        sessionSeed: `${state.prompt}-${state.previousHooks.length}-${Date.now()}`,
        previousHooks: [...state.previousHooks, state.hook].filter(Boolean),
        hookVariantIndex: state.previousHooks.length + (strongVariation ? 1 : 0),
        language: state.language,
        recentContentAngles: loadRecentContentAngles(),
        recentTitles: state.recentTitles,
        contentAngleId: state.contentAngleId ?? undefined,
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
    | 'savedProjectId'
    | 'characterDescription'
    | 'virlo'
    | 'hook'
    | 'script'
    | 'niche'
    | 'style'
    | 'visualStyle'
    | 'storyBible'
    | 'styleTemplateId'
    | 'language'
    | 'imageNote'
    | 'contentBrief'
    | 'sceneBlueprints'
    | 'outputAlignmentControls'
    | 'visualBible'
  >,
  sceneIds?: string[],
  variation = false,
  diversityAttempt = 0
): Promise<{
  scenes: GeneratedScene[]
  mock: boolean
  characterDescription?: string
}> {
  const res = await withStepTimeout(
    'storyboard_images',
    fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: state.scenes,
      sceneIds,
      projectId: state.savedProjectId ?? undefined,
      project_id: state.savedProjectId ?? undefined,
      variation,
      characterDescription: state.characterDescription || undefined,
      virlo: state.virlo ?? undefined,
      hook: state.hook,
      script: state.script,
      niche: state.niche,
      style: state.style,
      visualStyle: state.visualStyle ?? undefined,
      storyBible: state.storyBible ?? undefined,
      styleTemplateId: state.styleTemplateId ?? undefined,
      language: state.language,
      referenceStyleNote: state.imageNote ?? undefined,
      hasReferenceStyle: Boolean(state.imageNote?.trim()),
      diversityAttempt,
      contentBrief: state.contentBrief ?? undefined,
      sceneBlueprints: state.sceneBlueprints,
      visualBible: state.visualBible ?? undefined,
      outputAlignmentControls: state.outputAlignmentControls,
      consistencyInjection: buildConsistencyInjectionBlock(
        buildConsistencyMemory({
          characterDescription: state.characterDescription,
          storyBible: state.storyBible,
          visualStyle: state.visualStyle,
          style: state.style,
          sceneBlueprints: state.sceneBlueprints,
          scenes: state.scenes,
          outputAlignmentControls: state.outputAlignmentControls,
        })
      ),
    }),
  }),
    60_000
  )
  const data = (await res.json().catch((err) => {
    console.warn('[STEP_FAILURE]', { step: 'storyboard_images', error: String(err) })
    return {}
  })) as Record<string, unknown>
  if (handlePlanLimitResponse(res, data)) {
    throw new PlanLimitError(
      typeof data.error === 'string' ? data.error : undefined
    )
  }
  if (handleImageGenerationUnavailableResponse(res, data)) {
    throw new ImageGenerationUnavailableError(
      typeof data.message === 'string' ? data.message : undefined
    )
  }
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

async function fetchThumbnailCoverImage(
  state: Pick<
    QuickCutGenerationState,
    | 'savedProjectId'
    | 'hook'
    | 'title'
    | 'scenes'
    | 'characterDescription'
    | 'virlo'
    | 'niche'
    | 'style'
    | 'visualStyle'
    | 'storyBible'
    | 'styleTemplateId'
    | 'language'
    | 'imageNote'
    | 'contentBrief'
  >,
  options?: { variation?: boolean; diversityAttempt?: number }
): Promise<string | null> {
  const coverScene = buildThumbnailCoverScene({
    hook: state.hook,
    title: state.title,
    scenes: state.scenes,
    visualStyleLabel: state.visualStyle?.label ?? null,
  })
  const res = await fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: [coverScene],
      sceneIds: [THUMBNAIL_COVER_SCENE_ID],
      projectId: state.savedProjectId ?? undefined,
      project_id: state.savedProjectId ?? undefined,
      variation: options?.variation === true,
      diversityAttempt:
        typeof options?.diversityAttempt === 'number'
          ? options.diversityAttempt
          : 0,
      characterDescription: state.characterDescription || undefined,
      virlo: state.virlo ?? undefined,
      hook: state.hook,
      niche: state.niche,
      style: state.style,
      visualStyle: state.visualStyle ?? undefined,
      storyBible: state.storyBible ?? undefined,
      styleTemplateId: state.styleTemplateId ?? undefined,
      language: state.language,
      referenceStyleNote: state.imageNote ?? undefined,
      hasReferenceStyle: Boolean(state.imageNote?.trim()),
      contentBrief: state.contentBrief ?? undefined,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (handlePlanLimitResponse(res, data)) {
    throw new PlanLimitError(
      typeof data.error === 'string' ? data.error : undefined
    )
  }
  if (handleImageGenerationUnavailableResponse(res, data)) {
    throw new ImageGenerationUnavailableError(
      typeof data.message === 'string' ? data.message : undefined
    )
  }
  if (!res.ok) {
    throw new Error(String(data?.error || 'Thumbnail image generation failed'))
  }
  const scenes = Array.isArray(data.scenes)
    ? (data.scenes as GeneratedScene[])
    : []
  const cover = scenes.find((s) => s.id === THUMBNAIL_COVER_SCENE_ID)
  const url = options?.variation
    ? cover?.variationImageUrl?.trim() || cover?.imageUrl?.trim()
    : cover?.imageUrl?.trim()
  return url || null
}

async function persistThumbnailUrl(
  projectId: string | null,
  thumbnailUrl: string | null
): Promise<void> {
  if (!projectId || !thumbnailUrl?.trim()) return
  try {
    await updateProject(projectId, {
      thumbnail_url: thumbnailUrl.trim(),
    } as CinematicProjectPatch)
  } catch {
    /* in-memory thumbnail still shown */
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
  const previousState = get().generationStep
  const progress = STEP_PROGRESS[step]
  const patch: Partial<QuickCutGenerationState> = {
    generationStep: step,
    progress,
    eta: step === 'complete' ? 0 : get().eta,
  }
  if (!get().stageTabPinned) {
    const tab = generationStepToTab(step)
    if (tab) patch.activeStageTab = tab
    patch.currentWorkflowStep = workflowStepFromGenerationStep(step)
  }
  if (previousState !== step) {
    const prevStage = generationStepToProgressStageId(previousState)
    if (prevStage && currentStageStartedAt > 0) {
      recordStageDuration(prevStage, Date.now() - currentStageStartedAt)
    }
    currentStageStartedAt = Date.now()
    patch.currentStageStartedAt = currentStageStartedAt
    logStateTransition(previousState, step, {
      projectId: get().savedProjectId ?? undefined,
    })
  }
  set(patch)
}

function hasCreatorPackAssets(state: QuickCutGenerationState): boolean {
  return (
    state.scenes.length > 0 &&
    Boolean(state.voiceUrl?.trim()) &&
    Boolean(state.script?.trim() || state.hook?.trim())
  )
}

function isExportPollNetworkFailure(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('connection refused') ||
    msg.includes('load failed') ||
    msg.includes('err_connection_refused')
  )
}

function finalizeExportPollStopped(
  set: (patch: Partial<QuickCutGenerationState>) => void,
  get: () => QuickCutGenerationState,
  options?: { packReady?: boolean; renderError?: string | null }
) {
  const packReady = options?.packReady ?? hasCreatorPackAssets(get())
  patchSectionStatus(set, get, 'export', packReady ? 'completed' : 'failed')
  set({
    renderPollUrl: null,
    isRenderingVideo: false,
    renderStartedAt: null,
    generationStep: 'complete',
    progress: packReady ? 100 : get().progress,
    ...(packReady ? { exportPackageReady: true, renderError: null } : {}),
    ...(options?.renderError ? { renderError: options.renderError } : {}),
  })
  persistSession(get())
}

async function pollRenderJob(
  pollUrl: string,
  onUpdate?: (patch: { videoUrl?: string; label?: string; progress?: number }) => void,
  projectId?: string | null
): Promise<string> {
  const pollModule = await import('@/lib/reels/export-poll.client')
  const pollReelExportJob = pollModule.pollReelExportJob
  const capReelExportProgress = pollModule.capReelExportProgress
  if (typeof pollReelExportJob !== 'function') {
    throw new Error('Export poll unavailable — refresh the page and try Compile MP4 again.')
  }
  const capProgress =
    typeof capReelExportProgress === 'function'
      ? capReelExportProgress
      : (progress?: number) => {
          if (typeof progress !== 'number' || !Number.isFinite(progress)) return undefined
          return Math.min(95, Math.max(0, Math.round(progress)))
        }
  const startedAt = Date.now()
  useQuickCutGenerationStore.setState({ renderStartedAt: startedAt })

  return pollReelExportJob(pollUrl, {
    projectId,
    startedAt,
    onProgress: (patch) => {
      if (patch.label) onUpdate?.({ label: patch.label })
      if (patch.progress !== undefined) {
        const capped = capProgress(patch.progress) ?? patch.progress
        const exportProgress = Math.max(STEP_PROGRESS.render, capped)
        onUpdate?.({ progress: exportProgress })
        useQuickCutGenerationStore.setState({ progress: exportProgress })
      }
    },
  })
    .then((url) => {
      useQuickCutGenerationStore.setState({ renderStartedAt: null, progress: 100 })
      onUpdate?.({ videoUrl: url, progress: 100 })
      return url
    })
    .catch((err) => {
      useQuickCutGenerationStore.setState({ renderStartedAt: null })
      throw err
    })
}

async function requestVideoRender(state: QuickCutGenerationState, asyncMode: boolean) {
  const readiness = reelExportReadiness(state.scenes, state.voiceUrl)
  if (!readiness.ready && readiness.message) {
    return {
      renderRes: { ok: false, status: 400 } as Response,
      renderData: { error: readiness.message, status: 'failed' },
    }
  }

  if (state.savedProjectId && asyncMode) {
    try {
      console.log('[EXPORT] Project', { projectId: state.savedProjectId })
      console.log('[EXPORT] Scenes', state.scenes.map((s) => ({ id: s.id, imageUrl: s.imageUrl ?? null })))
      console.log('[EXPORT] Storyboards', state.storyboard?.map((s) => ({
        id: s.id,
        imageAssetPath: s.imageAssetPath ?? null,
      })))

      const backfillRes = await fetch(
        `/api/projects/${encodeURIComponent(state.savedProjectId)}/backfill-storyboard-assets`,
        { method: 'POST' }
      )
      const backfillData = (await backfillRes.json()) as {
        scenes?: typeof state.scenes
        error?: string
        missingAssets?: unknown
      }
      console.log('[EXPORT] Backfill', {
        status: backfillRes.status,
        ok: backfillRes.ok,
        error: backfillData.error,
      })
      if (backfillRes.ok) {
        if (Array.isArray(backfillData.scenes) && backfillData.scenes.length > 0) {
          useQuickCutGenerationStore.setState({
            scenes: backfillData.scenes,
            storyboard: backfillData.scenes,
          })
        }
      } else if (!backfillRes.ok && backfillData.error) {
        console.warn('[EXPORT] Backfill failed', {
          status: backfillRes.status,
          error: backfillData.error,
        })
      }
    } catch (err) {
      console.warn('[EXPORT] Backfill request failed', err)
    }

    const latest = useQuickCutGenerationStore.getState()
    exportPayloadTrace('project_loaded', {
      scenes: latest.scenes,
      storyboards: latest.storyboard ?? latest.scenes,
    })
    exportPayloadTrace('before_backfill', {
      scenes: latest.scenes,
      storyboards: latest.storyboard ?? latest.scenes,
    })
    const exportScenes = pickExportStoryboardScenes(latest.storyboard, latest.scenes)
    exportPayloadTrace('after_backfill', {
      scenes: exportScenes,
      storyboards: exportScenes,
    })
    exportPayloadTrace('before_payload_build', {
      scenes: exportScenes,
      storyboards: exportScenes,
    })
    const exportSnapshot = scenesToExportRequestPayload(exportScenes)
    exportPayloadTrace('after_payload_build', {
      scenes: exportSnapshot.scenes,
      storyboards: exportSnapshot.storyboards,
    })
    const exportPayload = {
      projectId: state.savedProjectId,
      quality: '1080p' as const,
      includeVoiceover: true,
      includeCaptions: true,
      ...exportSnapshot,
      script: state.script ?? null,
      voiceUrl: state.voiceUrl ?? null,
      thumbnailUrl: state.thumbnailImageUrl ?? null,
    }
    exportPayloadTrace('before_api_request', {
      scenes: exportSnapshot.scenes,
      storyboards: exportSnapshot.storyboards,
    })
    console.log('[EXPORT] Payload', exportPayload)
    const exportRes = await fetch('/api/reels/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportPayload),
    })
    const exportData = (await exportRes.json()) as Record<string, unknown>
    console.log('[EXPORT] Export API response', {
      status: exportRes.status,
      ok: exportRes.ok,
      exportData,
    })
    if (exportRes.ok && exportData.status === 'completed' && typeof exportData.reelUrl === 'string') {
      return {
        renderRes: exportRes,
        renderData: { videoUrl: exportData.reelUrl, status: 'completed' },
      }
    }
    if (exportRes.ok && typeof exportData.jobId === 'string') {
      const pathsModule = await import('@/lib/reels/export-paths')
      const reelExportPollPath = pathsModule.reelExportPollPath
      if (typeof reelExportPollPath !== 'function') {
        return {
          renderRes: { ok: false, status: 500 } as Response,
          renderData: {
            error: 'Export poll unavailable — refresh the page and try Compile MP4 again.',
            status: 'failed',
          },
        }
      }
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
      sceneMotion: state.sceneMotion,
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

function restoreWorkflowContinuity(): Pick<
  QuickCutGenerationState,
  'currentWorkflowStep' | 'completedWorkflowSteps' | 'lastVisitedStep'
> {
  const session = loadWorkflowSession()
  if (!session) {
    return {
      currentWorkflowStep: 'analyze',
      completedWorkflowSteps: [],
      lastVisitedStep: null,
    }
  }
  return {
    currentWorkflowStep: session.currentWorkflowStep,
    completedWorkflowSteps: session.completedWorkflowSteps,
    lastVisitedStep: session.lastVisitedStep,
  }
}

function persistWorkflowContinuity(state: QuickCutGenerationState) {
  saveWorkflowSession({
    currentWorkflowStep: state.currentWorkflowStep,
    completedWorkflowSteps: state.completedWorkflowSteps,
    lastVisitedStep: state.lastVisitedStep,
    projectId: state.savedProjectId,
    lastGeneratedAsset: inferLastGeneratedAsset(state.lastCompletedStep),
  })
  persistCreatorContinuity(state)
}

function persistCreatorContinuity(state: QuickCutGenerationState) {
  const projectId = state.savedProjectId
  if (!projectId) return
  const title = state.title.trim() || state.prompt.trim().slice(0, 80) || 'Untitled project'
  saveProjectContinuity({
    projectId,
    title,
    lastEditedAt: new Date().toISOString(),
    currentWorkflowStep: state.currentWorkflowStep,
    lastVisitedStep: state.lastVisitedStep,
    completedWorkflowSteps: state.completedWorkflowSteps,
    lastGeneratedAsset: inferLastGeneratedAsset(state.lastCompletedStep),
    lastCompletedStep: state.lastCompletedStep,
    scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    resumeHref: buildResumeHref(
      projectId,
      state.lastVisitedStep ?? state.currentWorkflowStep
    ),
  })
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
          ? getCinematicProjectsMigrationHint(err)
          : resolveSaveError(err),
    })
  })

  persistHookSession(state)
  persistCreatorContinuity(state)
}

function buildV3ContextFromStore(
  state: Pick<
    QuickCutGenerationState,
    | 'prompt'
    | 'parsedIntent'
    | 'duration'
    | 'niche'
    | 'style'
    | 'title'
    | 'hook'
    | 'script'
    | 'scenes'
    | 'sceneBlueprints'
    | 'contentBrief'
    | 'storyBible'
    | 'visualStyle'
    | 'voiceUrl'
    | 'reelTimeline'
    | 'creativeDirectorBrief'
    | 'visualBible'
    | 'v3PipelineState'
    | 'previousHooks'
  >
): V3PipelineContext {
  return {
    prompt: state.prompt,
    topic: state.parsedIntent?.cleanTopic ?? state.prompt,
    duration: state.duration,
    niche: state.niche,
    tone: state.style,
    title: state.title,
    hook: state.hook,
    script: state.script,
    scenes: state.scenes,
    sceneBlueprints: state.sceneBlueprints,
    contentBrief: state.contentBrief,
    storyBible: state.storyBible,
    visualStyle: state.visualStyle,
    voiceUrl: state.voiceUrl,
    reelTimeline: state.reelTimeline,
    creativeDirectorBrief: state.creativeDirectorBrief,
    visualBible: state.visualBible,
    creatorMemory: state.v3PipelineState.creatorMemory,
    previousHooks: state.previousHooks,
  }
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

  setCreatorProfileOverride: (override) => {
    set({ creatorProfileOverride: override })
  },

  ensureRecommendedElevenLabsVoice: async () => {
    const recommended = await ensureRecommendedElevenLabsVoiceForState(get())
    if (recommended) {
      set({
        elevenLabsVoiceId: recommended.voiceId,
        voiceName: recommended.name,
      })
    }
    const { selectVoiceProfile } = await import('@/lib/voice/voiceProfiles')
    const profile = selectVoiceProfile({
      niche: get().niche,
      tone: get().style,
      contentBrief: get().contentBrief,
      parsedIntent: get().parsedIntent,
    })
    if (!get().voiceProfileId) {
      set({ voiceProfileId: profile.id })
    }
  },

  regenerateVoice: async () => {
    const state = get()
    const script = state.script.trim()
    if (!script || state.isRegeneratingVoice) return
    set({ isRegeneratingVoice: true, voiceFallbackMessage: null })
    try {
      const { res, data } = await pipelineFetchJson('/api/regenerate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          niche: state.niche,
          tone: state.style,
          elevenLabsVoiceId: state.elevenLabsVoiceId ?? undefined,
          voiceName: state.voiceName ?? undefined,
          voiceProfileId: state.voiceProfileId ?? undefined,
          scenes: state.scenes,
          sceneBlueprints: state.sceneBlueprints,
          project_id: state.savedProjectId ?? undefined,
        }),
      })
      if (!res.ok || !data?.audioUrl) {
        set({
          voiceFallbackMessage:
            typeof data?.fallbackMessage === 'string'
              ? data.fallbackMessage
              : typeof data?.error === 'string'
                ? data.error
                : 'Voice regeneration failed',
        })
        return
      }
      set({
        voiceUrl: String(data.audioUrl),
        waveform: Array.isArray(data.waveform) ? (data.waveform as number[]) : state.waveform,
        voiceName: typeof data.voiceName === 'string' ? data.voiceName : state.voiceName,
        elevenLabsVoiceId:
          typeof data.elevenLabsVoiceId === 'string'
            ? data.elevenLabsVoiceId
            : state.elevenLabsVoiceId,
        voiceProfileId:
          typeof data.voiceProfileId === 'string' ? data.voiceProfileId : state.voiceProfileId,
        voiceMetadata:
          data.voiceMetadata && typeof data.voiceMetadata === 'object'
            ? (data.voiceMetadata as import('@/lib/voice/generateVoice').VoiceMetadata)
            : state.voiceMetadata,
        voiceFallbackMessage:
          typeof data.fallbackMessage === 'string' ? data.fallbackMessage : null,
        ...(Array.isArray(data.sceneBlueprints) && data.sceneBlueprints.length > 0
          ? { sceneBlueprints: data.sceneBlueprints }
          : {}),
      })
      if (state.savedProjectId) {
        void archiveQuickCutProject(get()).catch(() => {})
      }
      get().composeReelTimeline()
    } finally {
      set({ isRegeneratingVoice: false })
    }
  },

  reset: (options) => {
    const savedProjectId = options?.clearProject ? null : get().savedProjectId
    const lastGeneratedPrompt = options?.clearProject
      ? null
      : get().lastGeneratedPrompt
    clearHookSession()
    clearWorkflowSession()
    useContentQualityStore.getState().resetQualityReview()
    set({ ...INITIAL, savedProjectId, lastGeneratedPrompt, studioReviewMode: false })
  },

  setCurrentWorkflowStep: (step) => {
    set({ currentWorkflowStep: step, lastVisitedStep: step })
    persistWorkflowContinuity(get())
  },

  markWorkflowStepComplete: (step) => {
    set((state) => {
      const completed = state.completedWorkflowSteps.includes(step)
        ? state.completedWorkflowSteps
        : [...state.completedWorkflowSteps, step]
      return { completedWorkflowSteps: completed }
    })
    persistWorkflowContinuity(get())
  },

  syncWorkflowFromPipeline: () => {
    const state = get()
    const completed = inferCompletedWorkflowSteps(state.sectionStatus, state.generationStep)
    const active = inferActiveWorkflowStep(
      state.sectionStatus,
      state.generationStep,
      state.isComplete
    )
    set({
      completedWorkflowSteps: completed,
      currentWorkflowStep: state.stageTabPinned ? state.currentWorkflowStep : active,
    })
    persistWorkflowContinuity(get())
  },

  syncV3PipelineState: () => {
    const state = get()
    if (!state.v3PipelineEnabled) return
    const synced = syncV3StateFromContext(
      buildV3ContextFromStore(state),
      { ...state.v3PipelineState, enabled: true }
    )
    set({
      v3PipelineState: synced,
      creativeDirectorBrief: synced.creativeDirectorBrief,
      visualBible: synced.visualBible,
    })
  },

  syncPipelineOrchestrator: () => {
    const state = get()
    const derived = deriveReelPipelineState({
      jobId: state.pipelineJobId,
      isGenerating: state.isGenerating,
      isComplete: state.isComplete,
      generationStatus: state.generationStatus,
      generationStep: state.generationStep,
      sectionStatus: state.sectionStatus,
      script: state.script,
      scriptBeats: state.scriptBeats,
      scenes: state.scenes,
      voiceUrl: state.voiceUrl,
      videoUrl: state.videoUrl,
      reelTimeline: state.reelTimeline,
      renderPollUrl: state.renderPollUrl,
      isRenderingVideo: state.isRenderingVideo,
      renderError: state.renderError,
      videoRenderEnabled: state.videoRenderEnabled,
      requireSceneVideos: false,
    })
    set({
      pipelineStatus: derived.status,
      failedPipelineStage: derived.failedStage,
      progress: derived.progress,
      ...(derived.exportReady
        ? {
            videoUrl: derived.finalMp4Url,
            renderError: null,
            renderPollUrl: null,
            exportPackageReady: false,
            generationStep: 'complete' as const,
          }
        : {}),
    })
  },

  runV3Stage: async (stage) => {
    const state = get()
    if (!state.v3PipelineEnabled) return
    set({
      v3PipelineState: {
        ...state.v3PipelineState,
        currentStage: stage,
      },
    })
    const ctx = buildV3ContextFromStore(state)
    const result = await executeV3Stage(stage, ctx, {
      characterDescription: state.characterDescription,
      visualStyle: state.visualStyle,
      storyBible: state.storyBible,
      outputAlignmentControls: state.outputAlignmentControls,
      sceneMotion: state.sceneMotion,
      voiceMetadata: state.voiceMetadata,
      targetDurationSec: state.duration,
      creativeDirectorInput: {
        topic: ctx.topic,
        tone: state.style,
        niche: state.niche,
        duration: state.duration,
        sessionSeed: state.prompt,
        previousHooks: state.previousHooks,
        title: state.title,
        hook: state.hook,
      },
    })
    const next = get().v3PipelineState
    const completed =
      result.status === 'completed'
        ? [...new Set([...next.completedStages, stage])]
        : next.completedStages
    const patch: Partial<QuickCutGenerationState> = {
      v3PipelineState: {
        ...next,
        currentStage: null,
        completedStages: completed,
      },
    }
    if (stage === 'creative_director' && result.output) {
      const brief = result.output as CreativeDirectorBrief
      patch.creativeDirectorBrief = brief
      patch.contentBrief = brief.contentBrief
      patch.v3PipelineState = {
        ...patch.v3PipelineState!,
        creativeDirectorBrief: brief,
      }
    }
    if (stage === 'visual_bible' && result.output) {
      patch.visualBible = result.output as VisualBible
      patch.v3PipelineState = {
        ...patch.v3PipelineState!,
        visualBible: result.output as VisualBible,
      }
    }
    if (stage === 'timeline_composer' && result.output) {
      const tracks = result.output as import('@/lib/pipeline/v3-types').TimelineTracks
      if (tracks.reelTimeline) {
        patch.reelTimeline = tracks.reelTimeline
      }
      patch.v3PipelineState = {
        ...patch.v3PipelineState!,
        timelineTracks: tracks,
      }
    }
    if (stage === 'memory_system' && result.output) {
      patch.v3PipelineState = {
        ...patch.v3PipelineState!,
        creatorMemory: result.output as import('@/lib/pipeline/v3-types').V3CreatorMemory,
      }
    }
    set(patch)
  },

  setActiveStageTab: (tab, pinned = true) =>
    set({ activeStageTab: tab, stageTabPinned: pinned }),

  setCreatorBlueprint: (blueprintId) =>
    set({ blueprintId: normalizeCreatorBlueprintId(blueprintId) }),

  setStyleTemplateId: (templateId) =>
    set({ styleTemplateId: templateId?.trim() || null }),

  applyStyleTemplate: (templateId) => {
    const applied = applyStyleTemplateFields(templateId)
    if (!applied) return
    const state = get()
    set({
      styleTemplateId: applied.styleTemplateId,
      visualStyle: applied.visualStyle,
      storyBible: applied.storyBible,
      characterDescription: applied.characterDescription || state.characterDescription,
      outputAlignmentControls: {
        ...state.outputAlignmentControls,
        ...applied.outputAlignmentControls,
      },
      ...(applied.niche ? { niche: applied.niche } : {}),
      ...(applied.style ? { style: applied.style } : {}),
    })
  },

  followPipelineStage: () => {
    const tab = generationStepToTab(get().generationStep)
    if (tab) set({ activeStageTab: tab, stageTabPinned: false })
  },

  stopGeneration: async () => {
    const state = get()
    if (!state.isGenerating && !state.generationInFlight) return
    pipelineAbortRequested = true
    const lastCompleted = inferLastCompletedStep(state)
    try {
      await saveCompletedStages(state, 'Generation stopped')
    } catch {
      /* assets still in store */
    }
    set({
      isGenerating: false,
      generationInFlight: false,
      directingSceneLabel: null,
      lastCompletedStep: lastCompleted,
      generationStep: 'idle',
      generationState: 'idle',
      error: null,
    })
  },

  resumeGeneration: async () => {
    const state = get()
    if (state.isGenerating || state.generationInFlight || !state.prompt.trim()) return
    const resumeFrom = state.lastCompletedStep
    if (!resumeFrom && state.generationStatus !== 'failed') return

    await get().runPipeline({
      prompt: state.prompt,
      style: state.style,
      duration: state.duration,
      imageNote: state.imageNote ?? undefined,
      directorMode: state.directorMode,
      blueprintId: state.blueprintId ?? undefined,
      reuseProject: true,
      resumeFrom,
      skipResearch: true,
    })
  },

  runPipeline: async (input) => {
    /*
     * Quick Cut pipeline order:
     * 1. Rules content brief (sync) + parallel: memory hydrate, config fetch
     * 2. Parallel: hook/title + deep research + script (script uses brief, not hook)
     * 3. Parallel: visual direction (scenes) + voice
     * 4. Storyboard images (parallel per scene; thumbnail = scene 1)
     * 5. Motion + export
     */
    const rawPrompt = input.prompt.trim()
    const prompt = appendNotes(rawPrompt, input.imageNote, input.voiceNote, input.keywords)
    if (prompt.length < 6) return

    const parsedIntent = parseCreatorIntentSync(prompt)
    logParsedIntent(parsedIntent)
    void useCreatorMemoryStore.getState().hydrate()

    const now = Date.now()
    if (get().generationInFlight || get().isGenerating) return
    if (now - lastPipelineInvokeAt < PIPELINE_DEBOUNCE_MS) return
    lastPipelineInvokeAt = now
    pipelineAbortRequested = false
    set({ generationInFlight: true })

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
          storyBible: prior.storyBible,
          niche: prior.niche,
          language: prior.language,
          directorMode: prior.directorMode,
          blueprintId: prior.blueprintId,
          styleTemplateId: prior.styleTemplateId,
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

    const sessionLang = loadCreatorLanguageSession()
    const language = regenFresh
      ? preserved?.language ??
        input.language ??
        sessionLang?.projectLanguage ??
        loadContentLanguagePreference()
      : input.language ?? sessionLang?.projectLanguage ?? loadContentLanguagePreference()
    const languageMixed = sessionLang?.isMixed ?? sessionLanguageMixed()
    const directorMode = regenFresh
      ? preserved?.directorMode ?? input.directorMode ?? loadDirectorModePreference()
      : input.directorMode ?? loadDirectorModePreference()
    const blueprintId = regenFresh
      ? preserved?.blueprintId ?? normalizeCreatorBlueprintId(input.blueprintId)
      : normalizeCreatorBlueprintId(input.blueprintId)
    const styleTemplateId = regenFresh
      ? preserved?.styleTemplateId ?? prior.styleTemplateId
      : prior.styleTemplateId
    const blueprintPlatform =
      input.platform ?? creatorBlueprintById(blueprintId)?.suggestedPlatform
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
        parsedIntent,
        language,
        directorMode,
        blueprintId,
        styleTemplateId,
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
        parsedIntent,
        language,
        directorMode,
        blueprintId,
        styleTemplateId:
          regenFresh && !topicChanged ? preserved?.styleTemplateId ?? null : null,
        style: tone,
        duration,
        niche:
          regenFresh && !topicChanged
            ? preserved?.niche ?? (parsedIntent.niche as CinematicNiche | undefined) ?? 'storytelling'
            : (parsedIntent.niche as CinematicNiche | undefined) ?? 'storytelling',
          visualStyle:
          regenFresh && !topicChanged ? preserved?.visualStyle ?? null : null,
        storyBible:
          regenFresh && !topicChanged ? preserved?.storyBible ?? null : null,
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
        eta: 0,
        lastCompletedStep: null,
        failedAtStep: null,
        sectionStatus: resetSectionStatus(),
      })
    }

    logGenerationStart(preserveProjectId, prompt)
    pipelineStartedAt = Date.now()
    currentStageStartedAt = pipelineStartedAt
    set({
      generationStartedAt: pipelineStartedAt,
      currentStageStartedAt: pipelineStartedAt,
      generationCoreCompletedAt: null,
      exportCompletedAt: null,
    })
    genPerf.start('pipeline')

    const creatorProfileOverride =
      input.creatorProfileOverride ??
      (regenFresh ? prior.creatorProfileOverride : null) ??
      null
    set({
      creatorProfile: getCachedCreatorMemoryProfile(),
      creatorProfileOverride,
    })
    void fetchCreatorMemoryProfile().then((profile) => {
      if (hasCreatorProfileContent(profile)) {
        set({ creatorProfile: profile })
      }
    })

    void trackEvent(AnalyticsEvents.GENERATION_STARTED, {
      projectId: preserveProjectId,
      metadata: {
        resume: isResume,
        duration,
        niche: get().niche,
        style: tone,
      },
    })
    void trackFirstGenerationStarted({ projectId: preserveProjectId })

    let anyMock = false
    const missingKeys = new Set<string>()
    let config: Record<string, boolean> = {}
    let videoRenderEnabled = get().videoRenderEnabled
    let sceneVideoEnabled = get().sceneVideoEnabled
    let freeTier = false

    const configPromise = fetchQuickCutConfig()
      .then((cfg) => {
        config = cfg as Record<string, boolean>
        videoRenderEnabled = isClientVideoRenderEnabled(cfg.videoRenderEnabled === true)
        sceneVideoEnabled = cfg.sceneVideoEnabled === true
        freeTier = cfg.freeTierOnly === true
        const v3Enabled = isV3PipelineEnabledFromConfig(cfg as Record<string, unknown>)
        set({ videoRenderEnabled, sceneVideoEnabled, v3PipelineEnabled: v3Enabled })
        return cfg as Record<string, boolean>
      })
      .catch(() => ({} as Record<string, boolean>))

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
        missingKeys.add('TOGETHER_API_KEY')
      }
      if (step === 'voice' && !config.elevenlabs && !config.openai && !config.emergent) {
        if (freeTier) {
          missingKeys.add('OPENAI_API_KEY')
        } else {
          missingKeys.add('ELEVENLABS_API_KEY')
          missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'video' && videoRenderEnabled && !config.remotion) {
        missingKeys.add('VIDEO_RENDER_ENABLED')
      }
    }

    try {
      setStep(set, get, 'analyzing')
      await configPromise
      await ensureGenerationJobsMigration()

      if (!isResume || !get().contentBrief) {
        patchSectionStatus(set, get, 'contentDirectorBrief', 'generating')
        genPerf.start('content_brief')
        const briefResult = generateRulesContentBriefSync(
          contentBriefApiPayload(
            {
              prompt,
              parsedIntent,
              style: tone,
              duration,
              niche: get().niche,
              language,
              directorMode,
            },
            blueprintPlatform
          ),
          parsedIntent
        )
        set({
          contentBrief: briefResult.brief,
          progress: 8,
        })
        genPerf.log('content_brief', briefResult.source, {
          durationMs: briefResult.durationMs,
        })
        genPerf.end('content_brief')
        patchSectionStatus(set, get, 'contentDirectorBrief', 'completed')

        if (get().v3PipelineEnabled) {
          let v3Brief = generateRulesCreativeDirectorBriefSync({
            topic: prompt,
            tone,
            niche: get().niche,
            duration,
            language,
            directorMode,
            parsedIntent,
            sessionSeed,
            previousHooks: regenAvoidHooks,
          })
          try {
            const { res, data } = await pipelineFetchJson<typeof v3Brief>(
              '/api/v3/creative-director',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: parsedIntent.cleanTopic,
                  tone,
                  niche: get().niche,
                  duration,
                  language,
                  directorMode,
                  sessionSeed,
                  previousHooks: regenAvoidHooks,
                }),
                maxRetries: 0,
                timeoutMs: 20_000,
              }
            )
            if (res.ok && data?.brief) v3Brief = data
          } catch {
            /* rules fallback */
          }
          set({
            creativeDirectorBrief: v3Brief.brief,
            contentBrief: v3Brief.brief.contentBrief,
            v3PipelineState: {
              ...get().v3PipelineState,
              enabled: true,
              creativeDirectorBrief: v3Brief.brief,
              completedStages: ['creative_director'],
              startedAt: get().v3PipelineState.startedAt ?? new Date().toISOString(),
            },
          })
        }
      } else {
        patchSectionStatus(set, get, 'contentDirectorBrief', 'completed')
        set({ progress: 8 })
      }

      const sessionContentBrief = get().contentBrief

      let title = get().title
      let hook = get().hook
      let virlo = get().virlo

      const skipPreResearch =
        input.skipResearch === true ||
        isResume ||
        Boolean(get().researchDocument?.trim())

      const needsHook = stepShouldRun(resumeFrom, 'hook')
      const needsResearch = !skipPreResearch && stepShouldRun(resumeFrom, 'script')
      const needsScript = stepShouldRun(resumeFrom, 'script')

      let script = get().script
      let scriptData: Record<string, unknown> = {}
      let scriptTitle = title
      let scriptHook = hook
      let scriptNiche = get().niche
      let lockedVisualStyle = get().visualStyle
      let viralScript = get().viralScript

      const researchTask = needsResearch
        ? (async () => {
            genPerf.start('research')
            try {
              const researchResult = await pipelineFetchJson<
                import('@/types/deep-research').DeepResearchApiResponse
              >('/api/ai/deep-research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: parsedIntent.cleanTopic,
                  prompt,
                  language,
                  languageMixed,
                  directorMode,
                  parsedIntent: serializeParsedIntent(parsedIntent),
                }),
                maxRetries: 0,
                timeoutMs: DEEP_RESEARCH_TIMEOUT_MS,
              })
              if (researchResult.res.ok) {
                const rd = researchResult.data
                set({
                  researchDocument:
                    typeof rd.document === 'string' ? rd.document : null,
                  researchReport:
                    rd.report && typeof rd.report === 'object' ? rd.report : null,
                  researchMock: rd.mock === true,
                })
              }
            } catch {
              /* research is optional */
            }
            genPerf.end('research')
          })()
        : null

      await Promise.all([
        needsHook
          ? (async () => {
              patchSectionStatus(set, get, 'hook', 'generating')
              genPerf.start('hook')
              genPerf.log('hook', `started ${Date.now() - pipelineStartedAt}ms after pipeline click`)

              const progress = createHookProgressController((patch) => {
                const next: Partial<QuickCutGenerationState> = { ...patch }
                if (patch.generationStep) {
                  next.progress = STEP_PROGRESS[patch.generationStep]
                }
                if (patch.activeStageTab && !get().stageTabPinned) {
                  next.activeStageTab = patch.activeStageTab
                }
                set(next)
              })

              progress.start()

              try {
                const titleHookResult = await fetchValidatedTitleHook(
                  {
                    idea: prompt,
                    parsedIntent: serializeParsedIntent(parsedIntent),
                    sessionSeed,
                    language,
                    recentContentAngles: loadRecentContentAngles(),
                    recentTitles: get().recentTitles,
                    contentBrief: sessionContentBrief ?? undefined,
                    ...(regenAvoidHooks.length ? { previousHooks: regenAvoidHooks } : {}),
                  },
                  parsedIntent.rawInput,
                  get().recentTitles,
                  progress
                )
                const titleData = titleHookResult.data

                title = titleHookResult.title
                hook = formatFinalHook(titleHookResult.hook)
                virlo = (titleData.virlo as VirloMetadata | undefined) ?? null
                if (titleData.mock === true) anyMock = true

                set({
                  title,
                  hook,
                  virlo,
                  recentTitles: recordRecentTitle(get().recentTitles, title),
                  ...trackContentAngleFromResponse(titleData as Record<string, unknown>),
                  storyboard: isResume ? get().storyboard : [],
                  previousHooks: regenFresh ? regenAvoidHooks : [],
                  hookVariantNumber: regenFresh ? regenAvoidHooks.length + 1 : 1,
                  variationHistory: appendHookVersion(emptyVariationHistory(), hook, {
                    select: true,
                  }),
                })
                persistHookSession(get())
                patchSectionStatus(set, get, 'hook', 'completed')
                if (!regenFresh && hook) {
                  logHookAccept(hook, {
                    projectId: get().savedProjectId ?? undefined,
                    topic: parsedIntent.cleanTopic,
                    theme: useCompanionStore.getState().creativeBrief?.theme,
                  })
                }
                genPerf.end('hook')
              } finally {
                progress.stop()
              }
            })()
          : Promise.resolve(),
        needsScript
          ? (async () => {
              await configPromise
              if (researchTask) await researchTask

              setStep(set, get, 'script')
              patchSectionStatus(set, get, 'script', 'generating')
              patchSectionStatus(set, get, 'captions', 'generating')
              genPerf.start('script')

              const researchDocument = get().researchDocument ?? undefined
              const researchReport = get().researchReport ?? undefined
              const hookSeed = needsHook ? undefined : hook || undefined
              const titleSeed = needsHook ? undefined : title || undefined

              const scriptResult = await pipelineFetchJson('/api/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: parsedIntent.cleanTopic,
                  prompt,
                  rawInput: prompt,
                  parsedIntent: serializeParsedIntent(parsedIntent),
                  tone,
                  duration,
                  sessionSeed,
                  language,
                  languageMixed,
                  directorMode,
                  blueprintId,
                  ...(hookSeed ? { hook: hookSeed } : {}),
                  ...(titleSeed ? { title: titleSeed } : {}),
                  ...(blueprintPlatform ? { platform: blueprintPlatform } : {}),
                  niche: preserved?.topicChanged ? undefined : preserved?.niche,
                  visualStyle: preserved?.topicChanged
                    ? undefined
                    : preserved?.visualStyle ?? undefined,
                  transcript:
                    input.originalTranscript?.trim() ||
                    preserved?.originalTranscript ||
                    undefined,
                  voiceNote: input.voiceNote?.trim() || undefined,
                  regenFresh: regenFresh || undefined,
                  previousScript: regenFresh ? preserved?.previousScript : undefined,
                  previousHook: regenFresh ? preserved?.previousHook : undefined,
                  creatorMemoryBias: getCreatorMemoryBiasHints(),
                  creatorProfile: resolveCreatorProfilePayload(get()),
                  creativeBrief: useCompanionStore.getState().creativeBrief,
                  companionMemory: useCompanionStore.getState().creatorMemory,
                  memoryProfile: resolveMemoryProfilePayload(),
                  contentBrief: sessionContentBrief ?? undefined,
                  recentNarrativeFrameworks: loadRecentNarrativeFrameworks(),
                  ...creatorHistoryPayload(directorMode),
                  skipResearch: true,
                  skipStoryboard: true,
                  researchDocument,
                  researchReport,
                  contentAngleId: get().contentAngleId ?? undefined,
                  recentContentAngles: loadRecentContentAngles(),
                  hookFrameworkId: get().hookFramework ?? undefined,
                }),
                maxRetries: 1,
                timeoutMs: SCRIPT_GENERATION_TIMEOUT_MS,
              })
              scriptData = scriptResult.data
              if (!scriptResult.res.ok) {
                patchSectionStatus(set, get, 'script', 'failed')
                patchSectionStatus(set, get, 'captions', 'failed')
                logStepFailed('script', get().savedProjectId, 'script')
                throw new Error(String(scriptData?.error || 'Script generation failed'))
              }

              const narrativeFrameworkId =
                typeof scriptData.narrativeFrameworkId === 'string'
                  ? scriptData.narrativeFrameworkId
                  : null
              if (narrativeFrameworkId) {
                recordNarrativeFrameworkUsage(narrativeFrameworkId as NarrativeFrameworkId)
              }

              const output = scriptData.output as Record<string, unknown> | undefined
              const appliedHook = get().hook || hook
              const applied = applyScriptOutput(output, appliedHook)
              script = applied.script
              if (sessionContentBrief && script) {
                script = alignOutputToBrief(script, sessionContentBrief, 'script').text
              }
              scriptTitle = String(output?.title ?? get().title ?? title)
              scriptHook = resolveHookAfterScript({
                titleHook: get().hook || hook,
                outputHook: String(output?.hook ?? ''),
                script: applied.script,
                emotion: sessionContentBrief?.emotionalAngle,
              })
              if (sessionContentBrief && scriptHook) {
                scriptHook = formatFinalHook(
                  alignOutputToBrief(scriptHook, sessionContentBrief, 'hook').text,
                  { emotion: sessionContentBrief.emotionalAngle }
                )
              }
              if (scriptData.mock === true) {
                anyMock = true
                noteMissing('script')
              }

              const hookHistory =
                scriptHook && scriptHook !== appliedHook
                  ? appendPreviousHook([], appliedHook)
                  : []
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
                ...parseScriptArchetypeFromOutput(output),
                ...parseContentAngleFromResponse(output),
                title: scriptTitle,
                hook: scriptHook,
                researchDocument:
                  typeof scriptData.researchDocument === 'string'
                    ? scriptData.researchDocument
                    : get().researchDocument,
                researchReport:
                  scriptData.researchReport && typeof scriptData.researchReport === 'object'
                    ? (scriptData.researchReport as import('@/types/deep-research').DeepResearchReport)
                    : get().researchReport,
                researchMock: scriptData.researchMock === true,
                ...parseStoryboardFromApi(scriptData),
                previousHooks:
                  regenFresh && appliedHook
                    ? appendPreviousHook(regenAvoidHooks, appliedHook)
                    : hookHistory,
                virlo: (scriptData.virlo as VirloMetadata | undefined) ?? get().virlo ?? virlo,
                visualStyle: lockedVisualStyle,
                viralScript,
                niche: scriptNiche,
                variationHistory: appendHookVersion(get().variationHistory, scriptHook, {
                  select: true,
                }),
                lastCompletedStep: 'script',
              })
              patchSectionStatus(set, get, 'script', 'completed')
              patchSectionStatus(set, get, 'captions', 'completed')
              genPerf.end('script')
            })()
          : Promise.resolve(),
        needsResearch && !needsScript ? researchTask ?? Promise.resolve() : Promise.resolve(),
      ])

      throwIfPipelineAborted()

      title = get().title || title
      hook = get().hook || hook
      virlo = get().virlo ?? virlo
      script = get().script || script
      scriptTitle = get().title || scriptTitle
      scriptHook = get().hook || scriptHook
      scriptNiche = get().niche || scriptNiche
      lockedVisualStyle = get().visualStyle ?? lockedVisualStyle
      viralScript = get().viralScript ?? viralScript

      if (needsHook && hook.trim()) {
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
            trackFirstProjectCreated({ projectId: hookId, metadata: { source: 'quick_cut' } })
          }
        }
      }

      if (needsScript && script.trim()) {
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

      let voiceUrl: string | null = get().voiceUrl
      let waveform: number[] = get().waveform
      let voiceFallbackMessage: string | null = get().voiceFallbackMessage

      logTraceEnter('parallel_visual_voice', {
        resumeFrom,
        projectId: preserveProjectId,
      })
      await Promise.all([
        stepShouldRun(resumeFrom, 'visual_direction')
          ? runTracedStep(
              'visual_direction',
              async () => {
              patchSectionStatus(set, get, 'visualDirection', 'generating')
              genPerf.start('visual_direction')
              setStep(set, get, 'scenes')
              const storyboardFromScript = get().storyboardScenes
              const { res: scenesRes, data: scenesData } = await withStepTimeout(
                'visual_direction',
                pipelineFetchJson('/api/generate-scenes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    idea: prompt,
                    script,
                    sessionSeed,
                    language,
                    languageMixed,
                    directorMode,
                    visualStyle,
                    niche: scriptNiche,
                    duration,
                    researchDocument: get().researchDocument ?? undefined,
                    contentBrief: get().contentBrief ?? undefined,
                    ...(storyboardFromScript.length >= 2
                      ? { storyboardScenes: storyboardFromScript }
                      : {}),
                  }),
                  maxRetries: 2,
                }),
                90_000
              )
              if (!scenesRes.ok) {
                patchSectionStatus(set, get, 'visualDirection', 'failed')
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

              const storyBible = buildStoryBibleFromVisualDirection({
                scenes,
                script,
                characterDescription,
                visualStyle: visualStyle ?? lockedVisualStyle,
                style: tone,
                niche: scriptNiche,
                emotionalGoal: scriptVirlo?.emotionalGoal,
                existing: get().storyBible,
              })

              const sceneBlueprints = Array.isArray(scenesData.sceneBlueprints)
                ? parseSceneBlueprints(scenesData.sceneBlueprints)
                : buildBlueprintsForScenes(scenes, {
                    script,
                    characterDescription,
                    visualStyle: visualStyle ?? lockedVisualStyle,
                    storyBible,
                    controls: get().outputAlignmentControls,
                  })
              const alignedScenes = applyBlueprintsToScenes(scenes, sceneBlueprints)

              set({
                scenes: alignedScenes,
                storyboard: alignedScenes,
                characterDescription,
                storyBible,
                sceneBlueprints,
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
              patchSectionStatus(set, get, 'visualDirection', 'completed')
              genPerf.end('visual_direction')
            },
              { projectId: preserveProjectId, timeoutMs: 90_000 }
            )
          : Promise.resolve(),
        stepShouldRun(resumeFrom, 'voice')
          ? runTracedStep(
              'voice',
              async () => {
              patchSectionStatus(set, get, 'voice', 'generating')
              genPerf.start('voice')
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

              const { elevenLabsVoiceId, voiceName: selectedVoiceName, voiceProfileId } = get()
              const { res: voiceRes, data: voiceData } = await withStepTimeout(
                'voice',
                pipelineFetchJson('/api/generate-voice', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    script,
                    niche: get().niche,
                    tone: get().style,
                    elevenLabsVoiceId: elevenLabsVoiceId ?? undefined,
                    voiceName: selectedVoiceName ?? undefined,
                    voiceProfileId: voiceProfileId ?? undefined,
                    scenes: get().scenes,
                    sceneBlueprints: get().sceneBlueprints,
                    project_id: get().savedProjectId ?? undefined,
                  }),
                }),
                60_000
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
                if (typeof voiceData.voiceProfileId === 'string' && voiceData.voiceProfileId) {
                  set({ voiceProfileId: voiceData.voiceProfileId })
                }
                if (voiceData.voiceMetadata && typeof voiceData.voiceMetadata === 'object') {
                  set({ voiceMetadata: voiceData.voiceMetadata as import('@/lib/voice/generateVoice').VoiceMetadata })
                }
                if (Array.isArray(voiceData.sceneVoiceDirections) && get().sceneBlueprints.length > 0) {
                  const { applyVoiceDirectionToBlueprints } = await import('@/lib/voice/voiceDirector')
                  set({
                    sceneBlueprints: applyVoiceDirectionToBlueprints(
                      get().sceneBlueprints,
                      voiceData.sceneVoiceDirections
                    ),
                  })
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

              set({
                voiceUrl,
                waveform,
                voiceFallbackMessage,
                lastCompletedStep: 'voice',
              })
              const voiceId = await persistStepComplete(
                get(),
                'voice',
                buildArchiveInput(get(), buildGenerationOutput(get()))
              )
              if (voiceId) set({ savedProjectId: voiceId, saveState: 'saved' })
              patchSectionStatus(set, get, 'voice', voiceRes.ok ? 'completed' : 'failed')
              genPerf.end('voice')
              if (shouldTracePipeline()) {
                console.info(
                  '[STEP_COMPLETE]',
                  { step: 'voice', nextStep: 'storyboard', projectId: get().savedProjectId }
                )
              }
              armPipelineWatchdog('post_voice_await_storyboard', {
                projectId: get().savedProjectId,
                resumeFrom,
              })
            },
              { projectId: preserveProjectId, timeoutMs: 60_000 }
            )
          : Promise.resolve(),
      ])
      logTraceExit('parallel_visual_voice', {
        sceneCount: get().scenes.length,
        resumeFrom,
        projectId: get().savedProjectId,
      })

      if (!get().storyBible && scenes.length > 0) {
        const fallbackBible = buildStoryBibleFromVisualDirection({
          scenes,
          script,
          characterDescription,
          visualStyle: visualStyle ?? get().visualStyle,
          style: tone,
          niche: scriptNiche,
          emotionalGoal: scriptVirlo?.emotionalGoal,
        })
        set({ storyBible: fallbackBible })
      }

      throwIfPipelineAborted()

      const storyboardShouldRun =
        !QUICK_CUT_V2_TEXT_TO_VIDEO && stepShouldRun(resumeFrom, 'storyboard')
      logStepShouldRunDecision(resumeFrom, 'storyboard', storyboardShouldRun)

      if (storyboardShouldRun) {
        scenes = stripSceneImages(scenes)
      }

      let imgMock = false
      if (storyboardShouldRun) {
        clearPipelineWatchdog()
        logTraceEnter('storyboard', {
          sceneCount: scenes.length,
          projectId: get().savedProjectId,
        })
        setStep(set, get, 'images')
        patchSectionStatus(set, get, 'storyboard', 'generating')
        patchSectionStatus(set, get, 'thumbnail', 'generating')
        genPerf.start('storyboard')
        logPipelineStepStart('storyboard', get().savedProjectId)
        set({ directingSceneLabel: 'Composing visuals…' })

        const scenesToRender = scenes
          .map((scene, index) => ({ scene, index }))
          .filter(({ scene }) => scene?.id && !(isResume && scene.imageUrl))

        const thumbnailCoverPromise = fetchThumbnailCoverImage(get()).catch((err) => {
          if (err instanceof ImageGenerationUnavailableError) throw err
          return null
        })

        for (const { scene, index } of scenesToRender) {
          throwIfPipelineAborted()
          set({ directingSceneLabel: `Generating Storyboard Images… Scene ${index + 1} of ${scenesToRender.length}` })
          try {
            const imgResult = await fetchSceneImages(
              {
                ...get(),
                scenes: get().scenes.length ? get().scenes : scenes,
                characterDescription,
                hook: scriptHook,
                script,
                storyBible: get().storyBible,
              },
              [scene.id],
              false,
              regenFresh ? index + 1 : 0
            )
            useQuickCutGenerationStore.setState((state) => {
              const baseScenes = state.scenes.length ? state.scenes : scenes
              const patchById = new Map(
                imgResult.scenes.map((s) => [s.id, s] as const)
              )
              const patch = patchById.get(scene.id)
              const merged = patch
                ? mergeScenesById(baseScenes, [patch], [scene.id])
                : baseScenes
              const firstHasImage = Boolean(merged[0]?.imageUrl?.trim())
              return {
                scenes: merged,
                storyboard: merged,
                characterDescription:
                  imgResult.characterDescription || state.characterDescription,
                sectionStatus: {
                  ...state.sectionStatus,
                  thumbnail: firstHasImage ? 'completed' : state.sectionStatus.thumbnail,
                },
              }
            })
            scenes = get().scenes
            const mergedScene = get().scenes.find((s) => s.id === scene.id)
            if (mergedScene) {
              logStoryboardFrame(get().savedProjectId, {
                frameId: mergedScene.id,
                imageUrl: mergedScene.imageUrl,
                storagePath: mergedScene.imageAssetPath ?? null,
                persisted: Boolean(
                  mergedScene.imageAssetPath?.trim() || mergedScene.imageUrl?.trim()
                ),
              })
            }
            if (imgResult.mock) {
              imgMock = true
              anyMock = true
              noteMissing('images')
            }
          } catch (err) {
            if (err instanceof ImageGenerationUnavailableError) throw err
            logStepFailure('storyboard_scene', err, { sceneId: scene.id, index })
            imgMock = true
            anyMock = true
            noteMissing('images')
          }
        }

        scenes = get().scenes.length ? get().scenes : scenes
        logTraceExit('storyboard', {
          sceneCount: scenes.length,
          projectId: get().savedProjectId,
        })
        set({ directingSceneLabel: null, lastCompletedStep: 'storyboard' })
        patchSectionStatus(set, get, 'storyboard', 'completed')
        const sceneOneThumb = resolveActiveThumbnailUrl(null, scenes)
        if (sceneOneThumb) {
          set({ thumbnailImageUrl: sceneOneThumb })
        }
        genPerf.end('storyboard')

        const storyboardId = await withStepTimeout(
          'project_save_storyboard',
          persistStepComplete(
            get(),
            'storyboard',
            buildArchiveInput(get(), buildGenerationOutput(get()))
          ),
          60_000
        )
        if (storyboardId) set({ savedProjectId: storyboardId, saveState: 'saved' })

        try {
          const coverUrl = await thumbnailCoverPromise
          if (coverUrl) {
            set({ thumbnailImageUrl: coverUrl })
            patchSectionStatus(set, get, 'thumbnail', 'completed')
            void persistThumbnailUrl(get().savedProjectId, coverUrl)
          } else if (sceneOneThumb) {
            patchSectionStatus(set, get, 'thumbnail', 'completed')
            void persistThumbnailUrl(get().savedProjectId, sceneOneThumb)
          }
        } catch (err) {
          if (err instanceof ImageGenerationUnavailableError) throw err
          if (sceneOneThumb) {
            patchSectionStatus(set, get, 'thumbnail', 'completed')
          }
        }

        setStep(set, get, 'motion')
        set({ directingSceneLabel: 'Applying cinematic motion…' })
        const motionMap = assignSceneMotion(
          scenes,
          get().storyBible,
          get().sceneMotion,
          {
            sceneBlueprints: get().sceneBlueprints,
            outputAlignmentControls: get().outputAlignmentControls,
          }
        )
        scenes = applySceneMotionToScenes(scenes, motionMap)
        set({
          sceneMotion: motionMap,
          scenes,
          storyboard: scenes,
        })
        const motionProjectId = get().savedProjectId
        if (motionProjectId) {
          void updateProject(motionProjectId, {
            scene_motion: motionMap,
            scenes: scenesToStore(scenes),
          }).catch(() => undefined)
        }
        get().composeReelTimeline()
        await delay(350)
        set({ directingSceneLabel: null })

        await runSceneVideoGeneration(get, set)
      } else if (
        QUICK_CUT_V2_TEXT_TO_VIDEO &&
        stepShouldRun(resumeFrom, 'storyboard')
      ) {
        clearPipelineWatchdog()
        setStep(set, get, 'motion')
        patchSectionStatus(set, get, 'storyboard', 'completed')
        patchSectionStatus(set, get, 'visualDirection', 'completed')
        set({
          directingSceneLabel: 'Creating video scenes…',
          lastCompletedStep: 'visual_direction',
        })
        await runSceneVideoGeneration(get, set)
        set({ directingSceneLabel: null })
      }

      if (videoRenderEnabled && stepShouldRun(resumeFrom, 'export')) {
        await runSceneVideoGeneration(get, set)
      }

      const assemblyPresentation = storyboardShouldRun
        ? runCinematicAssemblyPresentation(get, set)
        : null

      voiceUrl = get().voiceUrl
      waveform = get().waveform
      voiceFallbackMessage = get().voiceFallbackMessage

      let videoUrl: string | null = get().videoUrl
      let renderError: string | null = get().renderError

      throwIfPipelineAborted()

      if (stepShouldRun(resumeFrom, 'export')) {
        set({
          generationCoreCompletedAt: get().generationCoreCompletedAt ?? Date.now(),
        })
        get().composeReelTimeline()
        commitPipelineStage(get, set, 'timeline_assembling', 'timeline')
        if (!validateStageOrFail(get, set, 'captions')) {
          genPerf.end('export')
          throw new Error(get().renderError ?? 'Caption generation failed')
        }
        commitPipelineStage(get, set, 'timeline_complete', 'timeline')
        setStep(set, get, 'render')
        genPerf.start('export')

        try {
          await ensureProjectArchived(get())
        } catch (err) {
          useQuickCutGenerationStore.setState({
            saveState: 'error',
            saveError: resolveSaveError(err),
          })
        }

        if (videoRenderEnabled) {
          const mp4Ok = await renderMp4AndWait(get, set, async () => {
            const { renderRes, renderData } = await requestVideoRender(get(), true)
            if (
              renderRes.ok &&
              typeof renderData.videoUrl === 'string' &&
              renderData.videoUrl
            ) {
              return { videoUrl: renderData.videoUrl }
            }
            if (!renderRes.ok) {
              return {
                error: String(renderData?.error || 'Video render unavailable'),
              }
            }
            const exportJobId =
              typeof renderData.jobId === 'string' ? renderData.jobId : undefined
            const pollUrl =
              typeof renderData.pollUrl === 'string' ? renderData.pollUrl : undefined
            if (renderData.mock === true) anyMock = true
            return { exportJobId, pollUrl }
          })
          videoUrl = get().videoUrl
          renderError = get().renderError
          if (mp4Ok && videoUrl) {
            set({ lastCompletedStep: 'export' })
            logExportSuccess({
              projectId: get().savedProjectId ?? undefined,
              title: get().title,
              hook: get().hook,
              theme: useCompanionStore.getState().creativeBrief?.theme,
              tone: get().style,
            })
            logWorkflowCompleteClient({
              projectId: get().savedProjectId ?? undefined,
              title: get().title,
              hook: get().hook,
              theme: useCompanionStore.getState().creativeBrief?.theme,
              tone: get().style,
              platform: 'instagram_reel',
              format: `${get().duration}s reel`,
              contentType: 'reel',
              scriptExcerpt: get().script?.slice(0, 400),
              eventType: 'export_success',
            })
            const exportId = await persistStepComplete(
              get(),
              'export',
              buildArchiveInput(get(), buildGenerationOutput(get()))
            )
            if (exportId) set({ savedProjectId: exportId, saveState: 'saved' })
          } else if (get().pipelineStatus === 'failed') {
            logStepFailed('export', get().savedProjectId, renderError ?? 'Export failed')
          }
        } else {
          failPipeline(get, set, 'export', 'MP4 export requires VIDEO_RENDER_ENABLED')
        }
        genPerf.end('export')
      }

      if (assemblyPresentation) {
        await assemblyPresentation
      }

      const mp4Ready = get().pipelineStatus === 'mp4_complete' && Boolean(get().videoUrl?.trim())
      const exportFailedFinal = get().pipelineStatus === 'failed'
      const contentReadyForResults = mp4Ready

      const pipeline: QuickCutPipelineStatus = {
        steps: {
          script:
            scriptData.mock === true ? 'fallback' : get().script.trim() ? 'live' : 'fallback',
          images: imgMock ? 'fallback' : 'live',
          voice: voiceUrl ? 'live' : 'fallback',
          video: videoRenderEnabled ? (mp4Ready ? 'live' : exportFailedFinal ? 'fallback' : 'skipped') : 'skipped',
        },
        missingKeys: [...missingKeys],
        live: !anyMock,
      }

      setStep(set, get, mp4Ready ? 'complete' : exportFailedFinal ? 'render' : 'complete')
      set({
        videoUrl: get().videoUrl,
        renderPollUrl: null,
        renderError: exportFailedFinal ? get().renderError : null,
        exportPackageReady: false,
        mock: anyMock,
        missingKeys: [...missingKeys],
        pipeline,
        isGenerating: false,
        isComplete: mp4Ready,
        generationStatus: exportFailedFinal ? 'failed' : mp4Ready ? 'completed' : 'completed',
        generationStep: mp4Ready ? 'complete' : exportFailedFinal ? 'render' : 'complete',
        generationState: 'idle',
        assemblyPreviewAutoplay: false,
        assemblyLineIndex: 0,
        lastCompletedStep: mp4Ready ? 'export' : get().lastCompletedStep,
        failedAtStep: exportFailedFinal ? 'export' : null,
        error: null,
        progress: mp4Ready ? 100 : exportFailedFinal ? 0 : get().progress,
        eta: 0,
        lastGeneratedPrompt: prompt,
        studioReviewMode: false,
        saveState: 'saved',
        generationInFlight: false,
      })
      get().composeReelTimeline()
      if (get().v3PipelineEnabled) {
        get().syncV3PipelineState()
      }

      genPerf.end('pipeline')
      genPerf.log('pipeline', 'completed', {
        durationMs: pipelineStartedAt ? Date.now() - pipelineStartedAt : undefined,
      })

      const completedArchive = buildArchiveInput(get(), buildGenerationOutput(get()))
      try {
        await archiveGeneratedProject({
          ...completedArchive,
          generation_status: exportFailedFinal ? 'failed' : 'completed',
          generation_step: 'export',
          last_completed_step: mp4Ready ? 'export' : get().lastCompletedStep ?? 'voice',
          generation_error: exportFailedFinal ? get().renderError : null,
        })
      } catch {
        /* preview session still holds state */
      }

      if (mp4Ready) {
        logGenerationSuccess(get().savedProjectId, {
          durationMs: pipelineStartedAt ? Date.now() - pipelineStartedAt : undefined,
          mock: anyMock,
          niche: get().niche,
        })
        trackEvent(AnalyticsEvents.GENERATION_COMPLETED, {
          projectId: get().savedProjectId,
          metadata: {
            duration_ms: pipelineStartedAt ? Date.now() - pipelineStartedAt : undefined,
            niche: get().niche,
            duration: get().duration,
            mock: anyMock,
          },
        })
        trackStoryGeneratedAfterCompanion(get().savedProjectId)
        trackFirstGenerationCompleted({ projectId: get().savedProjectId })
        markFirstGeneration()
        if (mp4Ready) {
          trackEvent(AnalyticsEvents.EXPORT_COMPLETED, {
            projectId: get().savedProjectId,
            metadata: { video: Boolean(get().videoUrl) },
          })
          trackExportCompletedAfterCompanion(get().savedProjectId)
          trackEvent(AnalyticsEvents.PROJECT_EXPORTED, {
            projectId: get().savedProjectId,
            metadata: { video: Boolean(get().videoUrl) },
          })
        }
      } else if (exportFailedFinal) {
        logGenerationError(
          get().savedProjectId,
          'export',
          get().renderError ?? 'Export failed',
          { recoverable: true }
        )
        trackEvent(AnalyticsEvents.GENERATION_FAILED, {
          projectId: get().savedProjectId,
          metadata: {
            message: get().renderError?.slice(0, 120) ?? 'Export failed',
            step: 'export',
          },
        })
        trackError('export', get().renderError ?? 'Export failed', {
          step: 'export',
          projectId: get().savedProjectId,
        })
      }

      persistSession(get())
    } catch (err) {
      if (err instanceof PipelineAbortedError) {
        pipelineAbortRequested = false
        set({ generationInFlight: false })
        genPerf.end('pipeline')
        persistSession(get())
        return
      }
      const serverDetail =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'
      logGenerationError(get().savedProjectId, get().generationStep, serverDetail, {
        recoverable: true,
      })
      if (err instanceof PlanLimitError) {
        showPlanLimitToast(err.message)
      }
      trackEvent(AnalyticsEvents.GENERATION_FAILED, {
        projectId: get().savedProjectId,
        metadata: {
          message: toUserGenerationError(err).slice(0, 120),
          step: get().generationStep,
        },
      })
      trackError('api', toUserGenerationError(err), {
        step: get().generationStep,
        projectId: get().savedProjectId,
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
        directingSceneLabel: null,
        generationInFlight: false,
      })
      genPerf.end('pipeline')
    }
  },

  regenerateThumbnailImage: async () => {
    const state = get()
    if (state.isGenerating || state.isRegeneratingThumbnail) return
    if (!state.hook?.trim() && !state.title?.trim() && state.scenes.length < 1) {
      toast.message('Generate storyboard first — thumbnail needs a hook or scene')
      return
    }

    set({ isRegeneratingThumbnail: true, directingSceneLabel: 'Composing cover…' })
    try {
      const diversityAttempt = Math.max(1, (state.thumbnailDisplayBust % 64) + 1)
      const coverUrl = await fetchThumbnailCoverImage(state, {
        variation: true,
        diversityAttempt,
      })
      if (!coverUrl) {
        if (!state.thumbnailImageUrl?.trim()) {
          const fallback = resolveActiveThumbnailUrl(null, state.scenes)
          if (fallback) {
            set({ thumbnailImageUrl: fallback })
            void persistThumbnailUrl(state.savedProjectId, fallback)
            toast.success('Using storyboard frame as cover')
          } else {
            toast.error('Could not generate thumbnail image')
          }
        } else {
          toast.error('Could not regenerate thumbnail image')
        }
        return
      }
      set({
        thumbnailImageUrl: coverUrl,
        thumbnailDisplayBust: Date.now(),
      })
      void persistThumbnailUrl(state.savedProjectId, coverUrl)
      patchSectionStatus(set, get, 'thumbnail', 'completed')
      persistSession(get())
      toast.success('Cover thumbnail generated')
    } catch (err) {
      if (err instanceof PlanLimitError) {
        showPlanLimitToast(err.message)
      } else {
        toast.error(toUserGenerationError(err) || 'Could not regenerate thumbnail')
      }
    } finally {
      set({ isRegeneratingThumbnail: false, directingSceneLabel: null })
    }
  },

  regenerateSceneImage: async (sceneId) => {
    const state = get()
    if (!sceneId || !canRegenerateSingleScene(state, sceneId)) return
    if (!state.scenes.some((s) => s.id === sceneId)) return

    set({
      regeneratingSceneIds: [...state.regeneratingSceneIds, sceneId],
      directingSceneLabel: 'Composing visuals…',
    })

    try {
      const result = await fetchSceneImages(state, [sceneId], false, state.previousHooks.length)
      const patch = result.scenes.find((s) => s.id === sceneId)
      const scenes = patch
        ? mergeScenesById(state.scenes, [patch], [sceneId])
        : state.scenes
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
      const isFirstScene = state.scenes[0]?.id === sceneId
      const nextThumb =
        updated?.imageUrl?.trim() && isFirstScene && !state.thumbnailImageUrl?.trim()
          ? updated.imageUrl.trim()
          : state.thumbnailImageUrl
      set({
        scenes,
        storyboard: scenes,
        variationHistory,
        thumbnailImageUrl: nextThumb,
        characterDescription:
          result.characterDescription || state.characterDescription,
      })
      if (isFirstScene && updated?.imageUrl?.trim()) {
        void persistThumbnailUrl(state.savedProjectId, updated.imageUrl.trim())
      }
      trackEvent(AnalyticsEvents.REGENERATE_SCENE, {
        projectId: get().savedProjectId,
        metadata: { scene_id: sceneId },
      })
      persistSession(get())
    } catch (err) {
      if (err instanceof PlanLimitError) {
        showPlanLimitToast(err.message)
      } else {
        toast.error(toUserGenerationError(err) || 'Could not regenerate scene')
      }
    } finally {
      set({
        regeneratingSceneIds: get().regeneratingSceneIds.filter((id) => id !== sceneId),
        directingSceneLabel: null,
      })
    }
  },

  restoreSceneImageUrl: (sceneId, imageUrl) => {
    const url = imageUrl.trim()
    if (!sceneId || !url) return
    const scenes = get().scenes.map((s) => (s.id === sceneId ? { ...s, imageUrl: url } : s))
    set({ scenes, storyboard: scenes })
    persistSession(get())
  },

  regenerateMissingSceneImages: async () => {
    const state = get()
    const missing = sceneExportReadiness(state.scenes).missing
    if (missing.length < 1 || state.isGenerating) return

    set({ renderError: null })
    for (const row of missing) {
      await get().regenerateSceneImage(row.id)
      const updated = get().scenes.find((s) => s.id === row.id)
      if (!updated?.imageUrl?.trim()) {
        toast.error(`Scene ${row.index} still missing an image — try again individually.`)
        break
      }
    }
    persistSession(get())
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
    if (!sceneId || !canRegenerateSingleScene(state, sceneId)) return
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
      const patch = result.scenes.find((s) => s.id === sceneId)
      const scenes = patch
        ? mergeScenesById(state.scenes, [patch], [sceneId])
        : state.scenes
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

  reorderScenes: (activeId, overId) => {
    const state = get()
    if (!canEditTimeline(state) || !activeId || !overId || activeId === overId) return

    const orderedIds = reorderSceneIds(
      state.scenes.map((s) => s.id),
      activeId,
      overId
    )
    if (!orderedIds) return

    const hadVideo = Boolean(state.videoUrl?.trim())
    const reordered = reorderScenesByIds(
      state.scenes,
      state.storyboardScenes,
      orderedIds
    )

    set({
      scenes: reordered.scenes,
      storyboard: reordered.scenes,
      storyboardScenes: reordered.storyboardScenes,
      visualTimeline: reordered.visualTimeline,
      videoUrl: hadVideo ? null : state.videoUrl,
      renderPollUrl: hadVideo ? null : state.renderPollUrl,
      renderError: hadVideo ? 'Scene order changed — recompile export.' : state.renderError,
    })
    persistSession(get())
    trackEvent(AnalyticsEvents.STORYBOARD_VIEWED, {
      projectId: get().savedProjectId,
      metadata: { scene_count: reordered.scenes.length, reordered: true },
    })
  },

  regenerateHook: async () => {
    const state = get()
    if (!state.hook.trim() || state.isRegeneratingHook || state.isGenerating) return

    set({
      isRegeneratingHook: true,
      activeStageTab: 'hook',
      stageTabPinned: true,
    })

    const progress = createHookProgressController((patch) => set(patch))

    progress.start()

    try {
      const priorHooks = state.previousHooks
      const currentHook = state.hook
      const avoid = [...priorHooks, currentHook]

      let result = await requestHookRegeneration(state, false)
      progress.markCandidate(result.hook)

      if (isHookTooSimilar(result.hook, avoid)) {
        result = await requestHookRegeneration(
          { ...state, previousHooks: priorHooks },
          true
        )
        progress.markCandidate(result.hook)
      }

      progress.markValidated(result.hook)

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

      const hookEmotion = state.contentBrief?.emotionalAngle?.trim()
      set({
        hook: formatFinalHook(result.hook, { emotion: hookEmotion }),
        previousHooks: nextPrevious,
        hookVariantNumber,
        hookFramework: result.hookFramework ?? state.hookFramework,
        virlo: nextVirlo,
        viralScript: state.viralScript
          ? { ...state.viralScript, hook: result.hook }
          : state.viralScript,
        variationHistory,
      })

      trackEvent(AnalyticsEvents.REGENERATE_HOOK, { projectId: get().savedProjectId })
      logHookRegen({
        projectId: get().savedProjectId ?? undefined,
        hook: result.hook,
      })
      persistSession(get())
    } catch {
      /* hook regen is non-blocking — user keeps current hook */
    } finally {
      progress.stop()
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
          parsedIntent: state.parsedIntent
            ? serializeParsedIntent(state.parsedIntent)
            : serializeParsedIntent(parseCreatorIntentSync(state.prompt)),
          sessionSeed: `${state.prompt}-title-${Date.now()}`,
          previousHooks: [state.title, state.hook].filter(Boolean),
          language: state.language,
          recentContentAngles: loadRecentContentAngles(),
          recentTitles: state.recentTitles,
          contentBrief: state.contentBrief ?? undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data?.error || 'Title regeneration failed'))

      const nextTitle = String(data.title ?? '').trim()
      if (!nextTitle) throw new Error('Title regeneration returned empty result')

      set({
        title: nextTitle,
        recentTitles: recordRecentTitle(get().recentTitles, nextTitle),
        ...trackContentAngleFromResponse(data),
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
          topic: state.parsedIntent?.cleanTopic ?? state.prompt,
          prompt: state.prompt,
          rawInput: state.prompt,
          parsedIntent: state.parsedIntent
            ? serializeParsedIntent(state.parsedIntent)
            : serializeParsedIntent(parseCreatorIntentSync(state.prompt)),
          tone: state.style,
          duration: state.duration,
          sessionSeed: `${state.prompt}-script-${Date.now()}`,
          language: state.language,
          directorMode: state.directorMode,
          blueprintId: state.blueprintId,
          title: state.title,
          hook: state.hook,
          niche: state.niche,
          visualStyle: state.visualStyle ?? undefined,
          transcript: state.originalTranscript?.trim() || undefined,
          regenFresh: true,
          previousScript: state.script?.trim() || undefined,
          previousHook: state.hook?.trim() || undefined,
          creatorMemoryBias: getCreatorMemoryBiasHints(),
          creatorProfile: resolveCreatorProfilePayload(state),
          creativeBrief: useCompanionStore.getState().creativeBrief,
          companionMemory: useCompanionStore.getState().creatorMemory,
          memoryProfile: resolveMemoryProfilePayload(),
          contentBrief: state.contentBrief ?? undefined,
          ...creatorHistoryPayload(state.directorMode),
          researchDocument: state.researchDocument ?? undefined,
          skipResearch: true,
          skipStoryboard: true,
          contentAngleId: state.contentAngleId ?? undefined,
          recentContentAngles: loadRecentContentAngles(),
          hookFrameworkId: state.hookFramework ?? undefined,
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
        ...parseScriptArchetypeFromOutput(output),
        ...parseContentAngleFromResponse(output),
        viralScript: state.viralScript
          ? { ...state.viralScript, script: applied.script }
          : state.viralScript,
      })
      logScriptRegen({ projectId: state.savedProjectId ?? undefined })
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
    set({ variationHistory: history, hook: formatFinalHook(version.text) })
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

    const profile = await fetchProfilePlanSnapshot()
    if (
      blockMp4CompileIfNeeded(profile.planType, {
        trialActive: profile.trialActive,
        logContext: { source: 'retryVideoRender' },
      })
    ) {
      patchSectionStatus(set, get, 'export', 'failed')
      set({
        renderError: null,
        exportPackageReady:
          state.scenes.length > 0 &&
          Boolean(state.voiceUrl?.trim()) &&
          Boolean(state.script?.trim() || state.hook?.trim()),
        generationStep: 'complete',
      })
      return
    }

    const preflight = reelExportReadiness(state.scenes, state.voiceUrl)
    if (!preflight.ready && preflight.message) {
      patchSectionStatus(set, get, 'export', 'failed')
      set({
        renderError: friendlyReelRenderError(preflight.message),
        renderPollUrl: null,
        exportExpired: false,
        isRenderingVideo: false,
        generationStep: 'complete',
      })
      persistSession(get())
      return
    }

    patchSectionStatus(set, get, 'export', 'generating')
    set({
      renderError: null,
      renderStatusLabel: null,
      renderPollUrl: null,
      isRenderingVideo: true,
      exportExpired: false,
      renderStartedAt: Date.now(),
    })

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
        const renderError = friendlyReelRenderError(
          String(renderData?.error || 'Video render unavailable')
        )
        const hasCreatorPackAssets =
          get().scenes.length > 0 &&
          Boolean(get().voiceUrl?.trim()) &&
          Boolean(get().script?.trim() || get().hook?.trim())
        patchSectionStatus(
          set,
          get,
          'export',
          hasCreatorPackAssets ? 'completed' : 'failed'
        )
        set({
          renderError,
          renderPollUrl: null,
          generationStep: 'complete',
          isRenderingVideo: false,
          ...(hasCreatorPackAssets ? { exportPackageReady: true } : {}),
        })
        persistSession(get())
        return
      }

      if (typeof renderData.videoUrl === 'string' && renderData.videoUrl) {
        patchSectionStatus(set, get, 'export', 'completed')
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
        patchSectionStatus(set, get, 'export', 'completed')
        set({
          videoUrl: sync.renderData.videoUrl,
          renderPollUrl: null,
          renderError: null,
          generationStep: 'complete',
        })
        persistSession(get())
        return
      }

      const syncErr = friendlyReelRenderError(
        String(sync.renderData?.error || 'Video render unavailable')
      )
      const packReady =
        get().scenes.length > 0 &&
        Boolean(get().voiceUrl?.trim()) &&
        Boolean(get().script?.trim() || get().hook?.trim())
      patchSectionStatus(set, get, 'export', packReady ? 'completed' : 'failed')
      set({
        renderError: packReady ? null : syncErr,
        renderPollUrl: null,
        generationStep: 'complete',
        ...(packReady ? { exportPackageReady: true } : {}),
      })
      persistSession(get())
    } catch (err) {
      const message = friendlyReelRenderError(
        err instanceof Error ? err.message : 'Video render unavailable'
      )
      const packReady =
        get().scenes.length > 0 &&
        Boolean(get().voiceUrl?.trim()) &&
        Boolean(get().script?.trim() || get().hook?.trim())
      patchSectionStatus(set, get, 'export', packReady ? 'completed' : 'failed')
      set({
        renderError: packReady ? null : message,
        renderPollUrl: null,
        generationStep: 'complete',
        ...(packReady ? { exportPackageReady: true } : {}),
      })
      persistSession(get())
    } finally {
      set({ isRenderingVideo: false })
    }
  },

  syncVideoRenderConfig: async () => {
    try {
      const config = (await fetchQuickCutConfig()) as Record<string, boolean>
      const videoRenderEnabled = isClientVideoRenderEnabled(config.videoRenderEnabled === true)
      const sceneVideoEnabled = config.sceneVideoEnabled === true
      set({ videoRenderEnabled, sceneVideoEnabled })
      const state = get()
      if (
        videoRenderEnabled &&
        state.pipelineJobId &&
        !state.videoUrl &&
        !state.isRenderingVideo &&
        state.pipelineStatus === 'mp4_rendering'
      ) {
        void get().resumeRenderPoll()
      }
    } catch {
      /* non-blocking */
    }
  },

  resumeRenderPoll: async () => {
    const { pipelineJobId, videoUrl, isRenderingVideo, savedProjectId } = get()
    if (!pipelineJobId || videoUrl || isRenderingVideo) return

    const profile = await fetchProfilePlanSnapshot()
    if (
      blockMp4CompileIfNeeded(profile.planType, {
        trialActive: profile.trialActive,
        logContext: { source: 'resumeRenderPoll' },
      })
    ) {
      return
    }

    const poll = await pollGenerationJobOrchestrator(pipelineJobId)
    if (!poll) return

    if (poll.status === 'mp4_complete' && poll.finalMp4Url) {
      completeMp4Pipeline(get, set, poll.finalMp4Url)
      persistSession(get())
      return
    }

    if (poll.status === 'failed') {
      failPipeline(get, set, poll.failedStage ?? 'export', poll.errorMessage ?? 'Export failed')
      persistSession(get())
      return
    }

    const exportJobId = (poll as { exportJobId?: string | null }).exportJobId
    if (poll.status === 'mp4_rendering' && exportJobId) {
      set({ isRenderingVideo: true, renderError: null })
      const ok = await resumeMp4FromGenerationJob(get, set, exportJobId)
      set({ isRenderingVideo: false })
      if (ok) persistSession(get())
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
      logPipelineStepStart('project_reload', projectId, { source: 'loadSavedProject' })
      const workflow = restoreWorkflowContinuity()
      set({
        ...INITIAL,
        ...patch,
        ...workflow,
        saveState: 'idle',
        saveError: null,
      })
      persistHookSession(get())
      persistCreatorContinuity(get())
      void get().syncVideoRenderConfig()
      if (!patch.reelTimeline && patch.scenes.length > 0) {
        get().composeReelTimeline()
      }
      if (get().pipelineJobId && !get().videoUrl && get().pipelineStatus === 'mp4_rendering') {
        void get().resumeRenderPoll()
      }
      return true
    } catch {
      return false
    }
  },

  setRepurposedAsset: (type, entry) => {
    set((state) => ({
      repurposedAssets: {
        ...state.repurposedAssets,
        [type]: entry,
      },
    }))
  },

  setContentSeries: (series) => set({ contentSeries: series }),

  persistContentSeries: async (series) => {
    set({ contentSeries: series })
    const state = get()
    if (!state.savedProjectId) return
    try {
      await updateProject(state.savedProjectId, {
        hook: state.hook,
        summary: state.hook,
        captionLines: state.hook ? [state.hook, state.cta].filter(Boolean) : [],
        niche: state.niche,
        suggestedVoiceStyle: 'warm_documentary',
        directorMode: state.directorMode,
        blueprintId: state.blueprintId,
        repurposedAssets: state.repurposedAssets,
        series,
      })
    } catch {
      /* keep in-memory series if save fails */
    }
  },

  setStoryBible: (bible) => {
    set({ storyBible: bible })
    const state = get()
    if (!state.savedProjectId) return
    void updateProject(state.savedProjectId, {
      story_bible: bible,
    }).catch(() => {})
  },

  updateStoryBible: (patch) => {
    const next = mergeStoryBible(get().storyBible, patch)
    get().setStoryBible(next)
  },

  setOutputAlignmentControls: (patch) => {
    const next = {
      ...get().outputAlignmentControls,
      ...patch,
    }
    set({ outputAlignmentControls: next })
    const state = get()
    if (state.scenes.length > 0) {
      const blueprints = buildBlueprintsForScenes(state.scenes, {
        script: state.script,
        characterDescription: state.characterDescription,
        visualStyle: state.visualStyle,
        storyBible: state.storyBible,
        controls: next,
      })
      const aligned = applyBlueprintsToScenes(state.scenes, blueprints)
      set({ sceneBlueprints: blueprints, scenes: aligned, storyboard: aligned })
      if (state.savedProjectId) {
        void updateProject(state.savedProjectId, {
          scenes: scenesToStore(aligned),
          sceneBlueprints: blueprints,
          outputAlignmentControls: next,
        } as import('@/lib/cinematic-projects').CinematicProjectPatch).catch(() => {})
      }
    } else if (state.savedProjectId) {
      void updateProject(state.savedProjectId, {
        outputAlignmentControls: next,
      } as import('@/lib/cinematic-projects').CinematicProjectPatch).catch(() => {})
    }
  },

  refreshSceneBlueprints: () => {
    const state = get()
    if (!state.scenes.length) return
    const blueprints = buildBlueprintsForScenes(state.scenes, {
      script: state.script,
      characterDescription: state.characterDescription,
      visualStyle: state.visualStyle,
      storyBible: state.storyBible,
      controls: state.outputAlignmentControls,
    })
    const aligned = applyBlueprintsToScenes(state.scenes, blueprints)
    set({ sceneBlueprints: blueprints, scenes: aligned, storyboard: aligned })
  },

  composeReelTimeline: () => {
    const state = get()
    const timeline = buildReelTimelineFromState(state)
    if (!timeline) return
    const durationMap = reelTimelineToSceneDurations(timeline)
    const scenes = state.scenes.map((scene) => {
      const id = scene.id
      const dur = durationMap[id]
      return dur != null ? { ...scene, duration: dur } : scene
    })
    set({ reelTimeline: timeline, scenes, storyboard: scenes })
    persistReelTimelineQuiet({ ...state, reelTimeline: timeline, scenes }, timeline)
  },

  updateReelTimelineClip: (sceneId, patch) => {
    const state = get()
    if (!state.reelTimeline) return
    const timeline = patchReelTimelineClip(state.reelTimeline, sceneId, patch)
    const durationMap = reelTimelineToSceneDurations(timeline)
    const scenes = state.scenes.map((scene) => {
      const dur = durationMap[scene.id]
      return dur != null ? { ...scene, duration: dur } : scene
    })
    set({ reelTimeline: timeline, scenes, storyboard: scenes })
    persistReelTimelineQuiet({ ...state, reelTimeline: timeline, scenes }, timeline)
  },

  setSceneMotionPreset: (sceneId, presetId) => {
    if (!isMotionPresetId(presetId)) return
    get().updateSceneMotion(sceneId, { presetId, source: 'manual' })
  },

  updateSceneMotion: (sceneId, patch) => {
    if (!sceneId) return
    const state = get()
    const prior = state.sceneMotion[sceneId]
    const presetId = patch.presetId ?? prior?.presetId ?? 'historical_push_in'
    if (patch.presetId && !isMotionPresetId(patch.presetId)) return
    const nextMap: SceneMotionMap = {
      ...state.sceneMotion,
      [sceneId]: {
        ...prior,
        presetId,
        ...patch,
        source: patch.source ?? prior?.source ?? 'manual',
      },
    }
    let scenes = applySceneMotionToScenes(state.scenes, nextMap)
    if (patch.duration != null) {
      scenes = scenes.map((s) =>
        s.id === sceneId ? { ...s, duration: patch.duration ?? s.duration } : s
      )
    }
    set({ sceneMotion: nextMap, scenes, storyboard: scenes })
    if (state.savedProjectId) {
      void updateProject(state.savedProjectId, {
        scenes: scenesToStore(scenes),
        scene_motion: nextMap,
      }).catch(() => {})
    }
    get().composeReelTimeline()
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
      if (id) {
        logProjectSave({
          projectId: id,
          title: get().title,
          hook: get().hook,
          theme: useCompanionStore.getState().creativeBrief?.theme,
          topic: get().parsedIntent?.cleanTopic ?? get().prompt,
        })
      }
      return id
    } catch (err) {
      set({ saveState: 'error', saveError: resolveSaveError(err) })
      return null
    }
  },
}))
export type QuickCutGenerationStoreState = QuickCutGenerationState & QuickCutGenerationActions
