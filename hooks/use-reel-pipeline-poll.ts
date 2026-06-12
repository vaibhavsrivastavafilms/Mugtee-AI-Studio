'use client'

import { useEffect, useRef } from 'react'
import {
  pollGenerationJobOrchestrator,
  derivePipelineStatusFromStore,
} from '@/lib/pipeline/reel-generation-orchestrator.client'
import {
  formatReelPipelineFailureMessage,
  isReelPipelineTerminal,
} from '@/lib/pipeline/reel-generation-orchestrator'
import { isValidGenerationJobId } from '@/lib/generation/stale-generation-job.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const POLL_MS = 2500

/**
 * Poll `/api/generation/jobs/[jobId]` until mp4_complete or failed.
 * Uses store `pipelineJobId` only — never pass a project UUID here.
 */
export function useReelPipelineJobPoll() {
  const pipelineJobId = useQuickCutGenerationStore((s) => s.pipelineJobId)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const stoppedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!pipelineJobId || !isValidGenerationJobId(pipelineJobId)) return
    if (stoppedRef.current.has(pipelineJobId)) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    const schedule = (ms: number) => {
      clearTimer()
      timer = setTimeout(() => {
        void tick()
      }, ms)
    }

    const tick = async () => {
      if (cancelled) return

      const poll = await pollGenerationJobOrchestrator(pipelineJobId, {
        projectId: savedProjectId,
      })

      if (cancelled) return

      if (!poll) {
        stoppedRef.current.add(pipelineJobId)
        return
      }

      const resumeRenderPoll = useQuickCutGenerationStore.getState().resumeRenderPoll

      if (poll.finalMp4Url) {
        useQuickCutGenerationStore.setState({
          videoUrl: poll.finalMp4Url,
          renderPollUrl: null,
          renderError: null,
          exportPackageReady: false,
          pipelineStatus: poll.status,
          pipelineJobId: poll.jobId,
          isComplete: true,
          isGenerating: false,
          progress: 100,
        })
      } else if (poll.status === 'failed') {
        useQuickCutGenerationStore.setState({
          pipelineStatus: poll.status,
          pipelineJobId: poll.jobId,
          isGenerating: false,
          renderError:
            formatReelPipelineFailureMessage({
              status: 'failed',
              failedStage: poll.failedStage,
              errorMessage: poll.errorMessage,
              progress: 0,
              currentStage: null,
              jobId: poll.jobId,
              finalMp4Url: null,
              timeline: null,
              exportReady: false,
            }) ?? poll.errorMessage,
          failedPipelineStage: poll.failedStage,
          isComplete: false,
        })
      } else {
        useQuickCutGenerationStore.setState({
          pipelineStatus: poll.status,
          pipelineJobId: poll.jobId,
          progress: poll.progress,
        })
        if (poll.status === 'mp4_rendering') {
          void resumeRenderPoll()
        }
      }

      if (isReelPipelineTerminal(poll.status)) return
      schedule(POLL_MS)
    }

    void tick()

    return () => {
      cancelled = true
      clearTimer()
    }
  }, [pipelineJobId, savedProjectId])
}

/** Selector hook — pipelineStatus from store fields (authoritative). */
export function useReelPipelineStatus() {
  return useQuickCutGenerationStore((s) => derivePipelineStatusFromStore(s))
}
