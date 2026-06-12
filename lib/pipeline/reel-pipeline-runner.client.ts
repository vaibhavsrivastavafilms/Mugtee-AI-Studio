'use client'

/**
 * Deterministic pipeline execution — updates store + generation_jobs directly.
 * No post-hoc adapter derivation after runPipeline completes.
 */

import {
  assertReelPipelineStage,
  formatReelPipelineFailureMessage,
  reelPipelineProgress,
  reelPipelineStateToJobMetadata,
  type ReelPipelineFailedStage,
  type ReelPipelineSnapshot,
  type ReelPipelineStageId,
  type ReelPipelineState,
  type ReelPipelineStatus,
  ReelPipelineStageError,
} from '@/lib/pipeline/reel-generation-orchestrator'
import { syncGenerationJobProgress } from '@/lib/generation/generation-job-sync.client'
import { isValidGenerationJobId } from '@/lib/generation/stale-generation-job.client'
import {
  pollGenerationJobUntilTerminal,
  quickCutStoreToPipelineSnapshot,
} from '@/lib/pipeline/reel-generation-orchestrator.client'
import type {
  QuickCutGenerationState,
  QuickCutGenerationActions,
} from '@/stores/quick-cut-generation-store'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { friendlyReelRenderError } from '@/lib/video/reel-render-errors'
import { reelExportPollPath } from '@/lib/reels/export-paths'

export { ReelPipelineStageError }

type StoreGet = () => QuickCutGenerationState & QuickCutGenerationActions
type StoreSet = (
  partial:
    | Partial<QuickCutGenerationState>
    | ((state: QuickCutGenerationState) => Partial<QuickCutGenerationState>)
) => void

export function buildPipelineSnapshotFromStore(
  get: StoreGet,
  overrides?: Partial<ReelPipelineSnapshot>
): ReelPipelineSnapshot {
  return {
    ...quickCutStoreToPipelineSnapshot(get()),
    requireSceneVideos: true,
    ...overrides,
  }
}

export function pipelineStageToStatus(
  stage: ReelPipelineStageId,
  phase: 'generating' | 'complete'
): ReelPipelineStatus {
  const map: Record<
    ReelPipelineStageId,
    { generating: ReelPipelineStatus; complete: ReelPipelineStatus }
  > = {
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

/** Persist orchestrator state to Zustand (authoritative — not derived). */
export function commitPipelineStage(
  get: StoreGet,
  set: StoreSet,
  status: ReelPipelineStatus,
  stage: ReelPipelineStageId | null,
  patch?: Partial<QuickCutGenerationState>
): void {
  set({
    pipelineStatus: status,
    progress: reelPipelineProgress(status),
    ...(patch ?? {}),
  })
  void syncPipelineJob(get, set, stage)
}

export async function syncPipelineJob(
  get: StoreGet,
  set: StoreSet,
  currentStage: ReelPipelineStageId | null = null
): Promise<string | null> {
  const state = get()
  if (!state.savedProjectId) return state.pipelineJobId

  const jobId = await syncGenerationJobProgress({
    jobId: state.pipelineJobId,
    projectId: state.savedProjectId,
    generationStep: state.generationStep,
    lastCompletedStep: state.lastCompletedStep,
    isGenerating: state.isGenerating,
    isComplete: state.isComplete,
    generationStatus: state.generationStatus,
    prompt: state.prompt,
    script: state.script,
    scriptBeats: state.scriptBeats,
    scenes: state.scenes,
    voiceUrl: state.voiceUrl,
    videoUrl: state.videoUrl,
    reelTimeline: state.reelTimeline,
    isRenderingVideo: state.isRenderingVideo,
    renderError: state.renderError,
    sectionStatus: state.sectionStatus,
    videoRenderEnabled: state.videoRenderEnabled,
  })

  if (jobId && isValidGenerationJobId(jobId) && jobId !== state.pipelineJobId) {
    set({ pipelineJobId: jobId })
  }
  return isValidGenerationJobId(jobId) ? jobId : isValidGenerationJobId(state.pipelineJobId) ? state.pipelineJobId : null
}

/** Verify generation_jobs table exists before pipeline runs. */
export async function ensureGenerationJobsMigration(): Promise<void> {
  const res = await fetch('/api/generation/jobs/health', {
    credentials: 'include',
    cache: 'no-store',
  })
  if (res.ok) return
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  throw new Error(
    data?.error ??
      'Generation jobs database is not ready. Apply migrations 0064 and 0065 in Supabase SQL Editor.'
  )
}

export function failPipeline(
  get: StoreGet,
  set: StoreSet,
  failedStage: ReelPipelineFailedStage,
  errorMessage: string
): ReelPipelineState {
  const jobId = get().pipelineJobId
  const state: ReelPipelineState = {
    status: 'failed',
    progress: 0,
    currentStage: null,
    failedStage,
    errorMessage,
    jobId,
    finalMp4Url: null,
    timeline: null,
    exportReady: false,
  }
  set({
    pipelineStatus: 'failed',
    failedPipelineStage: failedStage,
    progress: 0,
    generationStatus: 'failed',
    isGenerating: false,
    generationInFlight: false,
    renderError: formatReelPipelineFailureMessage(state) ?? errorMessage,
    isRenderingVideo: false,
  })
  void syncGenerationJobProgress({
    jobId,
    projectId: get().savedProjectId,
    generationStep: get().generationStep,
    lastCompletedStep: get().lastCompletedStep,
    isGenerating: false,
    isComplete: false,
    generationStatus: 'failed',
    prompt: get().prompt,
    script: get().script,
    scriptBeats: get().scriptBeats,
    scenes: get().scenes,
    voiceUrl: get().voiceUrl,
    videoUrl: null,
    reelTimeline: get().reelTimeline,
    isRenderingVideo: false,
    renderError: errorMessage,
    sectionStatus: get().sectionStatus,
    videoRenderEnabled: get().videoRenderEnabled,
  })
  return state
}

export function completeMp4Pipeline(
  get: StoreGet,
  set: StoreSet,
  finalMp4Url: string
): void {
  if (!isValidReelDownloadUrl(finalMp4Url)) {
    failPipeline(get, set, 'export', 'Final MP4 URL missing or invalid')
    return
  }
  set({
    pipelineStatus: 'mp4_complete',
    progress: 100,
    videoUrl: finalMp4Url,
    renderError: null,
    isRenderingVideo: false,
    generationStatus: 'completed',
    generationStep: 'complete',
    isComplete: true,
    isGenerating: false,
    generationInFlight: false,
    exportCompletedAt: Date.now(),
  })
  void syncGenerationJobProgress({
    jobId: get().pipelineJobId,
    projectId: get().savedProjectId,
    generationStep: 'complete',
    lastCompletedStep: 'export',
    isGenerating: false,
    isComplete: true,
    generationStatus: 'completed',
    prompt: get().prompt,
    script: get().script,
    scriptBeats: get().scriptBeats,
    scenes: get().scenes,
    voiceUrl: get().voiceUrl,
    videoUrl: finalMp4Url,
    reelTimeline: get().reelTimeline,
    isRenderingVideo: false,
    renderError: null,
    sectionStatus: get().sectionStatus,
    videoRenderEnabled: get().videoRenderEnabled,
  })
}

/** Validate stage or fail pipeline atomically. */
export function validateStageOrFail(
  get: StoreGet,
  set: StoreSet,
  stage: ReelPipelineStageId
): boolean {
  try {
    assertReelPipelineStage(stage, buildPipelineSnapshotFromStore(get))
    return true
  } catch (err) {
    if (err instanceof ReelPipelineStageError) {
      failPipeline(get, set, err.failedStage, err.message)
      return false
    }
    failPipeline(get, set, 'export', err instanceof Error ? err.message : 'Pipeline failed')
    return false
  }
}

/**
 * Poll generation job until mp4_complete or failed.
 * MP4 encode progress is synced to the job row by syncGenerationJobProgress during render.
 */
export async function pollPipelineJobUntilTerminal(
  jobId: string,
  onTick?: (poll: { status: ReelPipelineStatus; progress: number; finalMp4Url: string | null }) => void
): Promise<{ status: ReelPipelineStatus; finalMp4Url: string | null; errorMessage: string | null }> {
  const result = await pollGenerationJobUntilTerminal(jobId, {
    onTick: (poll) => {
      onTick?.({
        status: poll.status,
        progress: poll.progress,
        finalMp4Url: poll.finalMp4Url,
      })
    },
  })
  if (!result) {
    return { status: 'failed', finalMp4Url: null, errorMessage: 'Job poll failed' }
  }
  return {
    status: result.status,
    finalMp4Url: result.finalMp4Url,
    errorMessage: result.errorMessage,
  }
}

export function pipelineMetadataFromState(state: ReelPipelineState): Record<string, unknown> {
  return reelPipelineStateToJobMetadata(state)
}

/** Internal MP4 encode — polls export worker but syncs progress only via generation_jobs. */
export async function renderMp4AndWait(
  get: StoreGet,
  set: StoreSet,
  requestRender: () => Promise<{
    videoUrl?: string
    exportJobId?: string
    pollUrl?: string
    error?: string
  }>
): Promise<boolean> {
  if (!validateStageOrFail(get, set, 'timeline')) return false
  if (!validateStageOrFail(get, set, 'video')) return false

  commitPipelineStage(get, set, 'mp4_rendering', 'mp4', {
    isRenderingVideo: true,
    renderError: null,
    renderStartedAt: Date.now(),
  })

  const result = await requestRender()
  if (result.videoUrl && isValidReelDownloadUrl(result.videoUrl)) {
    completeMp4Pipeline(get, set, result.videoUrl)
    return true
  }
  if (result.error) {
    failPipeline(get, set, 'export', friendlyReelRenderError(result.error))
    return false
  }

  const exportJobId = result.exportJobId
  const pollUrl =
    result.pollUrl ??
    (exportJobId ? reelExportPollPath(exportJobId, get().savedProjectId ?? undefined) : null)

  if (!pollUrl) {
    failPipeline(get, set, 'export', 'MP4 render did not start')
    return false
  }

  if (exportJobId) {
    void syncGenerationJobProgress({
      jobId: get().pipelineJobId,
      projectId: get().savedProjectId,
      generationStep: 'render',
      lastCompletedStep: get().lastCompletedStep,
      isGenerating: true,
      isComplete: false,
      generationStatus: 'generating',
      pipelineStatus: 'mp4_rendering',
      exportJobId,
      prompt: get().prompt,
      script: get().script,
      scriptBeats: get().scriptBeats,
      scenes: get().scenes,
      voiceUrl: get().voiceUrl,
      videoUrl: null,
      reelTimeline: get().reelTimeline,
      isRenderingVideo: true,
      sectionStatus: get().sectionStatus,
      videoRenderEnabled: get().videoRenderEnabled,
    })
  }

  try {
    const pollModule = await import('@/lib/reels/export-poll.client')
    const url = await pollModule.pollReelExportJob(pollUrl, {
      projectId: get().savedProjectId,
      onProgress: (patch) => {
        const capped =
          typeof patch.progress === 'number'
            ? Math.max(reelPipelineProgress('mp4_rendering'), patch.progress)
            : reelPipelineProgress('mp4_rendering')
        set({
          progress: capped,
          renderStatusLabel: patch.label,
          pipelineStatus: 'mp4_rendering',
        })
        void syncPipelineJob(get, set, 'mp4')
      },
    })
    completeMp4Pipeline(get, set, url)
    return true
  } catch (err) {
    const message = friendlyReelRenderError(
      err instanceof Error ? err.message : 'Video render timed out'
    )
    failPipeline(get, set, 'export', message)
    return false
  }
}

/** Resume MP4 encode after refresh using exportJobId stored on generation_jobs. */
export async function resumeMp4FromGenerationJob(
  get: StoreGet,
  set: StoreSet,
  exportJobId: string
): Promise<boolean> {
  return renderMp4AndWait(get, set, async () => ({
    exportJobId,
    pollUrl: reelExportPollPath(exportJobId, get().savedProjectId ?? undefined),
  }))
}
