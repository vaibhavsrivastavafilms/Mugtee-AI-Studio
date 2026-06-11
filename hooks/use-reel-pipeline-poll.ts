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
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const POLL_MS = 2500

/**
 * Poll `/api/generation/jobs/[jobId]` until mp4_complete or failed.
 * Single allowed polling endpoint for pipeline progress.
 */
export function useReelPipelineJobPoll(jobId?: string | null) {
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const activeJobId = jobId ?? useQuickCutGenerationStore((s) => s.pipelineJobId)
  const pollingRef = useRef(false)

  useEffect(() => {
    if (!activeJobId) return
    if (pollingRef.current) return

    let cancelled = false
    pollingRef.current = true

    const tick = async () => {
      while (!cancelled) {
        const poll = await pollGenerationJobOrchestrator(activeJobId)
        if (cancelled || !poll) break

        if (poll.finalMp4Url) {
          useQuickCutGenerationStore.setState({
            videoUrl: poll.finalMp4Url,
            renderPollUrl: null,
            renderError: null,
            exportPackageReady: false,
            pipelineStatus: poll.status,
            pipelineJobId: poll.jobId,
            isComplete: true,
            progress: 100,
          })
        } else if (poll.status === 'failed') {
          useQuickCutGenerationStore.setState({
            pipelineStatus: poll.status,
            pipelineJobId: poll.jobId,
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

        if (isReelPipelineTerminal(poll.status)) break
        await new Promise((r) => setTimeout(r, POLL_MS))
      }
      pollingRef.current = false
    }

    void tick()

    return () => {
      cancelled = true
      pollingRef.current = false
    }
  }, [activeJobId, resumeRenderPoll, savedProjectId])
}

/** Selector hook — pipelineStatus from store fields (authoritative). */
export function useReelPipelineStatus() {
  return useQuickCutGenerationStore((s) =>
    derivePipelineStatusFromStore(s)
  )
}
