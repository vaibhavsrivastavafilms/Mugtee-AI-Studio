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
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { isActiveGenerationRun } from '@/lib/generation/restore-generation-job.client'
import { isValidGenerationJobId } from '@/lib/generation/stale-generation-job.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const POLL_MS = 2500
const NOT_FOUND_RETRY_MS = 3000
const MAX_NOT_FOUND_WARN_MS = 120_000

/**
 * Poll `/api/generation/jobs/[jobId]` until mp4_complete or failed.
 * Uses store `pipelineJobId` only — never pass a project UUID here.
 */
export function useReelPipelineJobPoll() {
  const pipelineJobId = useQuickCutGenerationStore((s) => s.pipelineJobId)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const notFoundSinceRef = useRef<number | null>(null)
  const zombieExportKickRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pipelineJobId || !isValidGenerationJobId(pipelineJobId)) return

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
        const now = Date.now()
        if (notFoundSinceRef.current == null) {
          notFoundSinceRef.current = now
        }
        const waitingMs = now - notFoundSinceRef.current
        if (waitingMs < MAX_NOT_FOUND_WARN_MS) {
          useQuickCutGenerationStore.setState({
            jobPollWarning: 'Waiting for generation job to sync…',
          })
        } else {
          useQuickCutGenerationStore.setState({
            jobPollWarning:
              'Generation job not found yet — still retrying. Stay on this page.',
          })
        }
        schedule(isGenerating ? NOT_FOUND_RETRY_MS : POLL_MS)
        return
      }

      notFoundSinceRef.current = null
      useQuickCutGenerationStore.setState({ jobPollWarning: null })

      const resumeRenderPoll = useQuickCutGenerationStore.getState().resumeRenderPoll
      const live = useQuickCutGenerationStore.getState()
      const localMp4Ready =
        live.pipelineStatus === 'mp4_complete' &&
        isValidReelDownloadUrl(live.videoUrl)
      const pollMp4Url =
        typeof poll.finalMp4Url === 'string' && isValidReelDownloadUrl(poll.finalMp4Url)
          ? poll.finalMp4Url
          : null

      // Storyboard already on client + job stuck at Researching @ 0% → kick export once.
      const storyboardReady =
        live.scenes.length > 0 &&
        live.scenes.every((s) => Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim()))
      const jobStuckEarly =
        (poll.progress ?? 0) < 50 &&
        (poll.status === 'queued' ||
          poll.status === 'script_generating' ||
          live.generationStep === 'analyzing' ||
          live.generationStep === 'hook')
      if (
        storyboardReady &&
        !live.videoUrl?.trim() &&
        jobStuckEarly &&
        zombieExportKickRef.current !== pipelineJobId
      ) {
        zombieExportKickRef.current = pipelineJobId
        useQuickCutGenerationStore.setState({
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
        })
        void useQuickCutGenerationStore.getState().resumeGeneration()
        return
      }

      // MP4 already finished locally — never let a stale poll downgrade to EXPORTING @ 99%.
      if (localMp4Ready) {
        useQuickCutGenerationStore.setState({
          pipelineStatus: 'mp4_complete',
          isComplete: true,
          isGenerating: false,
          isRenderingVideo: false,
          progress: 100,
          generationStep: 'complete',
          generationStatus: 'completed',
          jobPollWarning: null,
          pipelineJobId: poll.jobId,
        })
        return
      }

      if (pollMp4Url) {
        useQuickCutGenerationStore.setState({
          videoUrl: pollMp4Url,
          renderPollUrl: null,
          renderError: null,
          exportPackageReady: false,
          // Always terminal when URL is valid — ignore stale mp4_rendering status.
          pipelineStatus: 'mp4_complete',
          pipelineJobId: poll.jobId,
          isComplete: true,
          isGenerating: false,
          isRenderingVideo: false,
          generationStep: 'complete',
          generationStatus: 'completed',
          progress: 100,
          exportCompletedAt: Date.now(),
          jobPollWarning: null,
          sectionStatus: {
            ...live.sectionStatus,
            export: 'completed',
          },
        })
        return
      }

      if (poll.status === 'failed') {
        if (!isActiveGenerationRun(live)) {
          useQuickCutGenerationStore.setState({
            pipelineStatus: poll.status,
            pipelineJobId: poll.jobId,
            isGenerating: false,
            isRenderingVideo: false,
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
            jobPollWarning: null,
          })
        }
      } else {
        useQuickCutGenerationStore.setState((prev) => {
          // Never downgrade a finished MP4 back to rendering.
          if (
            prev.pipelineStatus === 'mp4_complete' &&
            isValidReelDownloadUrl(prev.videoUrl)
          ) {
            return {
              isComplete: true,
              isGenerating: false,
              isRenderingVideo: false,
              progress: 100,
              jobPollWarning: null,
            }
          }
          // Local export in flight — don't let a stale job row reset to Researching @ 0%.
          if (
            isActiveGenerationRun(prev) &&
            (prev.generationStep === 'render' ||
              prev.isRenderingVideo ||
              prev.pipelineStatus === 'mp4_rendering')
          ) {
            return {
              pipelineJobId: poll.jobId,
              progress: Math.max(prev.progress, poll.progress ?? 0, 92),
              jobPollWarning: null,
            }
          }
          const pollProgress = poll.progress ?? 0
          const pollStaleWhileGenerating =
            isActiveGenerationRun(prev) &&
            (poll.status === 'queued' || pollProgress < prev.progress)
          if (pollStaleWhileGenerating) {
            return {
              pipelineJobId: poll.jobId,
              progress: Math.max(prev.progress, pollProgress),
              jobPollWarning: null,
            }
          }
          return {
            pipelineStatus: poll.status,
            pipelineJobId: poll.jobId,
            progress: Math.max(prev.progress, pollProgress),
            jobPollWarning: null,
          }
        })
        if (
          poll.status === 'mp4_rendering' &&
          !useQuickCutGenerationStore.getState().videoUrl?.trim() &&
          !useQuickCutGenerationStore.getState().isRenderingVideo
        ) {
          void resumeRenderPoll()
        }
      }

      const latest = useQuickCutGenerationStore.getState()
      if (
        latest.pipelineStatus === 'mp4_complete' ||
        isReelPipelineTerminal(poll.status) ||
        isValidReelDownloadUrl(latest.videoUrl)
      ) {
        if (
          poll.status === 'failed' &&
          isActiveGenerationRun(useQuickCutGenerationStore.getState())
        ) {
          schedule(POLL_MS)
          return
        }
        return
      }
      schedule(POLL_MS)
    }

    notFoundSinceRef.current = null
    void tick()

    return () => {
      cancelled = true
      clearTimer()
    }
  }, [pipelineJobId, savedProjectId, isGenerating])
}

/** Selector hook — pipelineStatus from store fields (authoritative). */
export function useReelPipelineStatus() {
  return useQuickCutGenerationStore((s) => derivePipelineStatusFromStore(s))
}
