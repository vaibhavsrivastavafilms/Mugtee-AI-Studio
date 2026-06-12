'use client'

import type { ReelPipelineStatus } from '@/lib/pipeline/reel-generation-orchestrator'
import type { ActiveGenerationJob } from '@/lib/generation/generation-job-sync.client'
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
      if (staleId) {
        clearStaleGenerationJobReference({
          jobId: staleId,
          projectId,
          reason: 'missing-payload',
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
    patch.isGenerating = false
    patch.generationStatus = 'failed'
    patch.renderError = job.errorMessage ?? 'Generation failed'
  } else if (job.canResume) {
    patch.isGenerating = false
    patch.generationStatus = 'generating'
    if (job.lastCompletedStep) {
      patch.lastCompletedStep = job.lastCompletedStep as QuickCutGenerationStoreState['lastCompletedStep']
    }
  }

  set(patch)

  if (job.status === 'mp4_rendering' && !get().videoUrl) {
    void get().resumeRenderPoll()
  }
}
