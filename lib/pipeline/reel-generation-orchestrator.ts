/**
 * Deterministic reel generation chain — single source of truth for pipeline status.
 *
 * IDEA → SCRIPT → STORYBOARD IMAGES → VIDEO SCENES → VOICE → CAPTIONS → TIMELINE → MP4
 *
 * Export is ready only when status === mp4_complete and finalMp4Url is validated.
 */

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { ReelTimeline } from '@/lib/reel/types'
import { buildCaptionsSrt } from '@/lib/reel/export-format'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'

/** Canonical orchestrator states (persisted on generation_jobs.metadata.pipelineStatus). */
export type ReelPipelineStatus =
  | 'queued'
  | 'script_generating'
  | 'script_complete'
  | 'images_generating'
  | 'images_complete'
  | 'video_generating'
  | 'video_complete'
  | 'voice_generating'
  | 'voice_complete'
  | 'captions_generating'
  | 'captions_complete'
  | 'timeline_assembling'
  | 'timeline_complete'
  | 'mp4_rendering'
  | 'mp4_complete'
  | 'failed'

export type ReelPipelineFailedStage =
  | 'script'
  | 'images'
  | 'video'
  | 'voice'
  | 'captions'
  | 'timeline'
  | 'export'

export const REEL_PIPELINE_FAILED_STAGE_LABEL: Record<ReelPipelineFailedStage, string> = {
  script: 'SCRIPT',
  images: 'IMAGE',
  video: 'VIDEO',
  voice: 'VOICE',
  captions: 'CAPTIONS',
  timeline: 'TIMELINE',
  export: 'EXPORT',
}

export type ReelPipelineStageId =
  | 'script'
  | 'images'
  | 'video'
  | 'voice'
  | 'captions'
  | 'timeline'
  | 'mp4'

export type ReelPipelineTimeline = {
  scenes: GeneratedScene[]
  audio: string | null
  captionsSrt: string
  totalDurationSec: number
}

export type ReelPipelineSnapshot = {
  jobId?: string | null
  isGenerating?: boolean
  isComplete?: boolean
  generationStatus?: string
  generationStep?: string
  sectionStatus?: SectionStatusMap
  script?: string
  scriptBeats?: unknown[]
  scenes?: GeneratedScene[]
  voiceUrl?: string | null
  videoUrl?: string | null
  reelTimeline?: ReelTimeline | null
  renderPollUrl?: string | null
  isRenderingVideo?: boolean
  renderError?: string | null
  videoRenderEnabled?: boolean
  requireSceneVideos?: boolean
}

export type ReelPipelineState = {
  status: ReelPipelineStatus
  progress: number
  currentStage: ReelPipelineStageId | null
  failedStage: ReelPipelineFailedStage | null
  errorMessage: string | null
  jobId: string | null
  finalMp4Url: string | null
  timeline: ReelPipelineTimeline | null
  /** True only when mp4_complete + valid finalMp4Url */
  exportReady: boolean
}

export type ReelPipelinePollResponse = {
  status: ReelPipelineStatus
  progress: number
  currentStage: ReelPipelineStageId | null
  finalMp4Url: string | null
  failedStage: ReelPipelineFailedStage | null
  errorMessage: string | null
  jobId: string
}

const STAGE_ORDER: ReelPipelineStageId[] = [
  'script',
  'images',
  'video',
  'voice',
  'captions',
  'timeline',
  'mp4',
]

const STATUS_PROGRESS: Record<ReelPipelineStatus, number> = {
  queued: 0,
  script_generating: 8,
  script_complete: 15,
  images_generating: 22,
  images_complete: 38,
  video_generating: 45,
  video_complete: 55,
  voice_generating: 62,
  voice_complete: 72,
  captions_generating: 78,
  captions_complete: 84,
  timeline_assembling: 88,
  timeline_complete: 92,
  mp4_rendering: 96,
  mp4_complete: 100,
  failed: 0,
}

export function reelPipelineProgress(status: ReelPipelineStatus): number {
  return STATUS_PROGRESS[status] ?? 0
}

export function isReelPipelineTerminal(status: ReelPipelineStatus): boolean {
  return status === 'mp4_complete' || status === 'failed'
}

export function isReelExportReady(state: Pick<ReelPipelineState, 'status' | 'finalMp4Url'>): boolean {
  return state.status === 'mp4_complete' && isValidReelDownloadUrl(state.finalMp4Url)
}

function sceneCount(snapshot: ReelPipelineSnapshot): number {
  return snapshot.scenes?.length ?? 0
}

function scenesHaveImages(scenes: GeneratedScene[]): boolean {
  if (scenes.length < 1) return false
  return scenes.every((s) => Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim()))
}

function scenesHaveVideos(scenes: GeneratedScene[]): boolean {
  if (scenes.length < 1) return false
  return scenes.every((s) => Boolean(s.videoUrl?.trim()))
}

function scriptValid(snapshot: ReelPipelineSnapshot): boolean {
  const hasScript = Boolean(snapshot.script?.trim())
  const hasBeats = (snapshot.scriptBeats?.length ?? 0) > 0
  const hasScenes = sceneCount(snapshot) > 0
  return (hasScript || hasBeats) && hasScenes
}

function voiceValid(snapshot: ReelPipelineSnapshot): boolean {
  return Boolean(snapshot.voiceUrl?.trim())
}

function captionsValid(snapshot: ReelPipelineSnapshot, timeline: ReelPipelineTimeline | null): boolean {
  if (snapshot.sectionStatus?.captions === 'completed') return true
  const srt = timeline?.captionsSrt?.trim() ?? ''
  if (!srt) return false
  const cueCount = (srt.match(/\n\n/g) ?? []).length + (srt.includes('-->') ? 1 : 0)
  return cueCount > 0
}

export function buildReelPipelineTimeline(snapshot: ReelPipelineSnapshot): ReelPipelineTimeline | null {
  const scenes = snapshot.scenes ?? []
  if (scenes.length < 1 || !voiceValid(snapshot)) return null
  const reelTimeline = snapshot.reelTimeline
  if (!reelTimeline || reelTimeline.totalDurationSec <= 0) return null
  let captionsSrt = ''
  try {
    captionsSrt = buildCaptionsSrt(reelTimeline)
  } catch {
    captionsSrt = ''
  }
  return {
    scenes,
    audio: snapshot.voiceUrl?.trim() ?? null,
    captionsSrt,
    totalDurationSec: reelTimeline.totalDurationSec,
  }
}

function mp4Valid(snapshot: ReelPipelineSnapshot): boolean {
  const url = snapshot.videoUrl?.trim()
  return Boolean(url && isValidReelDownloadUrl(url))
}

type StageValidation = {
  ok: boolean
  failedStage?: ReelPipelineFailedStage
  message?: string
}

export type ReelPipelineStageValidation = StageValidation

export class ReelPipelineStageError extends Error {
  readonly failedStage: ReelPipelineFailedStage
  readonly status = 'failed' as const

  constructor(failedStage: ReelPipelineFailedStage, message: string) {
    super(message)
    this.name = 'ReelPipelineStageError'
    this.failedStage = failedStage
  }
}

/** Throws ReelPipelineStageError when a stage is incomplete. */
export function assertReelPipelineStage(
  stage: ReelPipelineStageId,
  snapshot: ReelPipelineSnapshot
): void {
  const result = validateStage(stage, snapshot)
  if (!result.ok) {
    throw new ReelPipelineStageError(
      result.failedStage ?? 'export',
      result.message ?? `Stage ${stage} validation failed`
    )
  }
}

function validateStage(stage: ReelPipelineStageId, snapshot: ReelPipelineSnapshot): StageValidation {
  switch (stage) {
    case 'script':
      if (!scriptValid(snapshot)) {
        return { ok: false, failedStage: 'script', message: 'Script or scene list missing' }
      }
      return { ok: true }
    case 'images':
      if (!scenesHaveImages(snapshot.scenes ?? [])) {
        return { ok: false, failedStage: 'images', message: 'Every scene must have a storyboard image' }
      }
      return { ok: true }
    case 'video': {
      if (snapshot.requireSceneVideos !== true) {
        return { ok: true }
      }
      if (!scenesHaveVideos(snapshot.scenes ?? [])) {
        return { ok: false, failedStage: 'video', message: 'Every scene must have a generated video clip' }
      }
      return { ok: true }
    }
    case 'voice':
      if (!voiceValid(snapshot)) {
        return { ok: false, failedStage: 'voice', message: 'Voiceover URL missing' }
      }
      return { ok: true }
    case 'captions': {
      const timeline = buildReelPipelineTimeline(snapshot)
      if (!captionsValid(snapshot, timeline)) {
        return { ok: false, failedStage: 'captions', message: 'Caption track missing' }
      }
      return { ok: true }
    }
    case 'timeline': {
      const timeline = buildReelPipelineTimeline(snapshot)
      if (!timeline || timeline.totalDurationSec <= 0) {
        return { ok: false, failedStage: 'timeline', message: 'Timeline duration must be greater than zero' }
      }
      return { ok: true }
    }
    case 'mp4':
      if (!mp4Valid(snapshot)) {
        return { ok: false, failedStage: 'export', message: 'Final MP4 URL missing or invalid' }
      }
      return { ok: true }
    default:
      return { ok: true }
  }
}

/** Highest contiguous completed stage index (0-based). */
function completedStageIndex(snapshot: ReelPipelineSnapshot): number {
  let idx = -1
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    if (validateStage(STAGE_ORDER[i], snapshot).ok) idx = i
    else break
  }
  return idx
}

function statusForStage(stage: ReelPipelineStageId, phase: 'generating' | 'complete'): ReelPipelineStatus {
  const map: Record<ReelPipelineStageId, { generating: ReelPipelineStatus; complete: ReelPipelineStatus }> = {
    script: { generating: 'script_generating', complete: 'script_complete' },
    images: { generating: 'images_generating', complete: 'images_complete' },
    video: { generating: 'video_generating', complete: 'video_complete' },
    voice: { generating: 'voice_generating', complete: 'voice_complete' },
    captions: { generating: 'captions_generating', complete: 'captions_complete' },
    timeline: { generating: 'timeline_assembling', complete: 'timeline_complete' },
    mp4: { generating: 'mp4_rendering', complete: 'mp4_complete' },
  }
  return map[stage][phase]
}

function stageIdToFailedStage(stage: ReelPipelineStageId): ReelPipelineFailedStage {
  return stage === 'mp4' ? 'export' : stage
}

function inferGeneratingStage(snapshot: ReelPipelineSnapshot): ReelPipelineStageId | null {
  if (!snapshot.isGenerating && !snapshot.isRenderingVideo && !snapshot.renderPollUrl) {
    return null
  }
  const step = snapshot.generationStep ?? 'idle'
  const section = snapshot.sectionStatus
  const storyboardGenerating = section?.storyboard === 'generating'
  if (step === 'render' || snapshot.isRenderingVideo || snapshot.renderPollUrl) return 'mp4'
  if (step === 'voice' || section?.voice === 'generating') return 'voice'
  if (step === 'motion') return 'video'
  if (step === 'images' || storyboardGenerating) return 'images'
  if (step === 'script' || step === 'scenes' || section?.script === 'generating') return 'script'
  if (section?.captions === 'generating') return 'captions'
  const done = completedStageIndex(snapshot)
  const next = STAGE_ORDER[done + 1]
  return next ?? null
}

/**
 * Derive orchestrator state from Quick Cut store snapshot (migration adapter).
 * Does not mutate store — call syncReelPipelineOrchestrator to persist.
 */
export function deriveReelPipelineState(snapshot: ReelPipelineSnapshot): ReelPipelineState {
  const jobId = snapshot.jobId ?? null
  const errorMessage = snapshot.renderError?.trim() || null

  if (snapshot.generationStatus === 'failed' && errorMessage) {
    const done = completedStageIndex(snapshot)
    const failedStageId = STAGE_ORDER[Math.min(done + 1, STAGE_ORDER.length - 1)] ?? 'mp4'
    const failedStage = stageIdToFailedStage(failedStageId)
    return {
      status: 'failed',
      progress: reelPipelineProgress('failed'),
      currentStage: failedStageId,
      failedStage,
      errorMessage,
      jobId,
      finalMp4Url: null,
      timeline: buildReelPipelineTimeline(snapshot),
      exportReady: false,
    }
  }

  if (mp4Valid(snapshot)) {
    const timeline = buildReelPipelineTimeline(snapshot)
    return {
      status: 'mp4_complete',
      progress: 100,
      currentStage: 'mp4',
      failedStage: null,
      errorMessage: null,
      jobId,
      finalMp4Url: snapshot.videoUrl!.trim(),
      timeline,
      exportReady: true,
    }
  }

  const done = completedStageIndex(snapshot)
  const generating = inferGeneratingStage(snapshot)

  if (generating) {
    const status = statusForStage(generating, 'generating')
    return {
      status,
      progress: reelPipelineProgress(status),
      currentStage: generating,
      failedStage: null,
      errorMessage: null,
      jobId,
      finalMp4Url: null,
      timeline: buildReelPipelineTimeline(snapshot),
      exportReady: false,
    }
  }

  if (done >= 0) {
    const stage = STAGE_ORDER[done]!
    const status = statusForStage(stage, 'complete')
    const next = STAGE_ORDER[done + 1]
    const pendingStatus = next ? statusForStage(next, 'generating') : status
    return {
      status: snapshot.isComplete ? pendingStatus : status,
      progress: reelPipelineProgress(snapshot.isComplete ? pendingStatus : status),
      currentStage: next ?? stage,
      failedStage: null,
      errorMessage: null,
      jobId,
      finalMp4Url: null,
      timeline: buildReelPipelineTimeline(snapshot),
      exportReady: false,
    }
  }

  return {
    status: snapshot.isGenerating ? 'script_generating' : 'queued',
    progress: reelPipelineProgress(snapshot.isGenerating ? 'script_generating' : 'queued'),
    currentStage: snapshot.isGenerating ? 'script' : null,
    failedStage: null,
    errorMessage: null,
    jobId,
    finalMp4Url: null,
    timeline: null,
    exportReady: false,
  }
}

export function formatReelPipelineFailureMessage(state: ReelPipelineState): string | null {
  if (state.status !== 'failed' || !state.failedStage) return null
  const label = REEL_PIPELINE_FAILED_STAGE_LABEL[state.failedStage]
  const detail = state.errorMessage?.trim()
  return detail
    ? `Generation failed during: ${label} — ${detail}`
    : `Generation failed during: ${label}`
}

export function reelPipelineStateToPollResponse(
  state: ReelPipelineState,
  jobId: string
): ReelPipelinePollResponse {
  return {
    status: state.status,
    progress: state.progress,
    currentStage: state.currentStage,
    finalMp4Url: state.finalMp4Url,
    failedStage: state.failedStage,
    errorMessage: state.errorMessage,
    jobId,
  }
}

export function reelPipelineStateToJobMetadata(state: ReelPipelineState): Record<string, unknown> {
  return {
    pipelineStatus: state.status,
    pipelineProgress: state.progress,
    pipelineStage: state.currentStage,
    failedStage: state.failedStage,
    finalMp4Url: state.finalMp4Url,
    exportReady: state.exportReady,
    label: pipelineStatusLabel(state.status, state.currentStage),
  }
}

function pipelineStatusLabel(
  status: ReelPipelineStatus,
  stage: ReelPipelineStageId | null
): string {
  if (status === 'mp4_complete') return 'Reel export complete'
  if (status === 'failed') return 'Generation failed'
  if (status === 'mp4_rendering') return 'Rendering MP4…'
  if (stage) return `Generating · ${stage}`
  return 'Queued'
}

/** Run validations in order — returns first failing stage (for explicit orchestrated runs). */
export function validateReelPipelineChain(snapshot: ReelPipelineSnapshot): StageValidation {
  for (const stage of STAGE_ORDER) {
    const result = validateStage(stage, snapshot)
    if (!result.ok) return result
  }
  return { ok: true }
}
