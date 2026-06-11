'use client'

import {
  deriveReelPipelineState,
  isReelPipelineTerminal,
  type ReelPipelinePollResponse,
  type ReelPipelineSnapshot,
  type ReelPipelineState,
} from '@/lib/pipeline/reel-generation-orchestrator'
import type { QuickCutGenerationStoreState } from '@/stores/quick-cut-generation-store'

export function quickCutStoreToPipelineSnapshot(
  state: Pick<
    QuickCutGenerationStoreState,
    | 'script'
    | 'scriptBeats'
    | 'scenes'
    | 'voiceUrl'
    | 'videoUrl'
    | 'reelTimeline'
    | 'isRenderingVideo'
    | 'renderError'
    | 'isGenerating'
    | 'isComplete'
    | 'generationStatus'
    | 'generationStep'
    | 'sectionStatus'
    | 'videoRenderEnabled'
    | 'pipelineJobId'
  >
): ReelPipelineSnapshot {
  return {
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
    isRenderingVideo: state.isRenderingVideo,
    renderError: state.renderError,
    videoRenderEnabled: state.videoRenderEnabled,
    requireSceneVideos: true,
  }
}

export function derivePipelineStatusFromStore(
  state: Parameters<typeof quickCutStoreToPipelineSnapshot>[0]
): ReelPipelineState {
  return deriveReelPipelineState(quickCutStoreToPipelineSnapshot(state))
}

export type GenerationJobOrchestratorPoll = ReelPipelinePollResponse & {
  canResume?: boolean
  label?: string
  exportJobId?: string | null
}

/** Poll durable job — single endpoint for pipeline progress. */
export async function pollGenerationJobOrchestrator(
  jobId: string
): Promise<GenerationJobOrchestratorPoll | null> {
  const res = await fetch(`/api/generation/jobs/${encodeURIComponent(jobId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as {
    status?: string
    progress?: number
    currentStage?: string | null
    finalMp4Url?: string | null
    failedStage?: string | null
    errorMessage?: string | null
    jobId?: string
    job?: GenerationJobOrchestratorPoll
  } | null

  if (data?.status && data.jobId) {
    return data as GenerationJobOrchestratorPoll
  }

  const job = data?.job
  if (!job?.jobId) return null
  return job
}

export async function pollGenerationJobUntilTerminal(
  jobId: string,
  options?: {
    intervalMs?: number
    onTick?: (poll: GenerationJobOrchestratorPoll) => void
    signal?: AbortSignal
  }
): Promise<GenerationJobOrchestratorPoll | null> {
  const intervalMs = options?.intervalMs ?? 2000
  while (!options?.signal?.aborted) {
    const poll = await pollGenerationJobOrchestrator(jobId)
    if (!poll) return null
    options?.onTick?.(poll)
    if (isReelPipelineTerminal(poll.status)) return poll
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return null
}
