'use client'

import type { ReelPipelineStatus } from '@/lib/pipeline/reel-generation-orchestrator'
import type { ActiveGenerationJob } from '@/lib/generation/generation-job-sync.client'
import { clearStoredGenerationJobId } from '@/lib/generation/generation-job-session.client'
import {
  clearStaleGenerationJobReference,
  isValidGenerationJobId,
} from '@/lib/generation/stale-generation-job.client'
import type { QuickCutGenerationStoreState } from '@/stores/quick-cut-generation-store'

type StoreGet = () => QuickCutGenerationStoreState
type StoreSet = (
  partial:
    | Partial<QuickCutGenerationStoreState>
    | ((state: QuickCutGenerationStoreState) => Partial<QuickCutGenerationStoreState>)
) => void

export function isActiveGenerationRun(
  state: Pick<QuickCutGenerationStoreState, 'isGenerating' | 'generationInFlight'>
): boolean {
  return state.isGenerating || state.generationInFlight
}

function resumeGenerationStepFromJob(
  job: ActiveGenerationJob
): QuickCutGenerationStoreState['generationStep'] {
  const step = job.currentStep?.trim()
  if (step === 'hook') return 'hook'
  if (step === 'script') return 'script'
  if (step === 'scenes' || step === 'visual_direction') return 'scenes'
  if (step === 'images' || step === 'storyboard') return 'images'
  if (step === 'motion') return 'motion'
  if (step === 'voice') return 'voice'
  if (step === 'render' || step === 'export') return 'render'
  if (step === 'complete') return 'complete'

  const last = job.lastCompletedStep
  if (last === 'hook') return 'script'
  if (last === 'script') return 'scenes'
  if (last === 'visual_direction') return 'voice'
  if (last === 'voice') return 'images'
  if (last === 'storyboard') return 'motion'
  if (last === 'export') return 'complete'
  return 'analyzing'
}

/** Rehydrate store + polling from a durable generation_jobs row after refresh. */
export function applyActiveGenerationJobToStore(
  job: ActiveGenerationJob | null | undefined,
  get: StoreGet,
  set: StoreSet,
  projectId?: string | null
): void {
  if (!job?.jobId) {
    if (projectId) {
      const staleId = get().pipelineJobId
      const live = get()
      if (staleId && !(isActiveGenerationRun(live) && live.savedProjectId === projectId)) {
        clearStaleGenerationJobReference({
          jobId: staleId,
          projectId,
          reason: 'missing-payload',
          resetGenerationUi: !live.isGenerating,
        })
      }
    }
    return
  }

  if (!isValidGenerationJobId(job.jobId)) {
    clearStaleGenerationJobReference({
      jobId: job.jobId,
      projectId: projectId ?? get().savedProjectId,
      reason: 'invalid-id',
    })
    return
  }

  const live = get()
  if (isActiveGenerationRun(live)) {
    if (job.jobId && job.jobId !== live.pipelineJobId) {
      set({ pipelineJobId: job.jobId })
    }
    return
  }

  const patch: Partial<QuickCutGenerationStoreState> = {
    pipelineJobId: job.jobId,
    pipelineStatus: job.status as ReelPipelineStatus,
    progress: job.progress,
  }

  if (job.finalMp4Url) {
    patch.videoUrl = job.finalMp4Url
    patch.isComplete = true
    patch.isGenerating = false
    patch.generationStatus = 'completed'
    patch.generationStep = 'complete'
    patch.renderPollUrl = null
    patch.renderError = null
  } else if (job.status === 'failed') {
    const resumable =
      Boolean(live.lastCompletedStep || live.failedAtStep) &&
      !live.videoUrl &&
      !live.isComplete
    if (resumable) {
      if (projectId ?? live.savedProjectId) {
        clearStoredGenerationJobId(projectId ?? live.savedProjectId, job.jobId)
      }
      set({ pipelineJobId: null, jobPollWarning: null })
      return
    }
    patch.isGenerating = false
    patch.generationStatus = 'failed'
    patch.renderError = job.errorMessage ?? 'Generation failed'
  } else if (job.canResume) {
    const scenesHaveImages = live.scenes.some((s) =>
      Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim())
    )
    const jobLooksBehindLocal =
      scenesHaveImages &&
      !live.videoUrl?.trim() &&
      ((job.progress ?? 0) < 50 ||
        job.status === 'queued' ||
        !job.currentStep ||
        job.currentStep === 'analyzing' ||
        job.currentStep === 'hook' ||
        job.currentStep === 'script' ||
        job.currentStep === 'scenes' ||
        job.currentStep === 'visual_direction')

    // Zombie job: storyboard already on the client, job still at Researching @ 0%.
    // Clear the stale row reference so export resume can run (don't poll forever).
    if (jobLooksBehindLocal) {
      const pid = projectId ?? live.savedProjectId
      if (pid) clearStoredGenerationJobId(pid, job.jobId)
      set({
        pipelineJobId: null,
        jobPollWarning: null,
        isGenerating: false,
        generationInFlight: false,
        generationStatus: 'failed',
        failedAtStep: 'export',
        lastCompletedStep: live.lastCompletedStep ?? 'storyboard',
        generationStep: 'render',
        progress: Math.max(live.progress || 0, 92),
        pipelineStatus: 'timeline_complete',
        error: null,
        renderError: null,
      })
      return
    }

    patch.isGenerating = false
    patch.generationStatus = 'generating'
    patch.generationStep = resumeGenerationStepFromJob(job)
    patch.error = null
    patch.failedAtStep = null
    if (job.lastCompletedStep) {
      patch.lastCompletedStep = job.lastCompletedStep as QuickCutGenerationStoreState['lastCompletedStep']
    }
  }

  set(patch)

  if (job.status === 'mp4_rendering' && !get().videoUrl) {
    void get().resumeRenderPoll()
  }
}
