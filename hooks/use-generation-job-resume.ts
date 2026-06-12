'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchActiveGenerationJob,
  syncGenerationJobProgress,
} from '@/lib/generation/generation-job-sync.client'
import { applyActiveGenerationJobToStore } from '@/lib/generation/restore-generation-job.client'
import {
  clearStoredGenerationJobId,
  readStoredGenerationJobId,
  writeStoredGenerationJobId,
} from '@/lib/generation/generation-job-session.client'
import {
  clearStaleGenerationJobReference,
  isValidGenerationJobId,
} from '@/lib/generation/stale-generation-job.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

export type GenerationJobResumeState = {
  jobId: string | null
  label: string | null
  progress: number
  canResume: boolean
  showBanner: boolean
  resume: () => void
}

/** Phase 6 — cross-device resume + refresh-safe generation progress. */
export function useGenerationJobResume(projectId?: string | null): GenerationJobResumeState {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      savedProjectId: s.savedProjectId,
      generationStep: s.generationStep,
      lastCompletedStep: s.lastCompletedStep,
      isGenerating: s.isGenerating,
      isComplete: s.isComplete,
      generationStatus: s.generationStatus,
      prompt: s.prompt,
      script: s.script,
      scriptBeats: s.scriptBeats,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      videoUrl: s.videoUrl,
      reelTimeline: s.reelTimeline,
      isRenderingVideo: s.isRenderingVideo,
      renderError: s.renderError,
      sectionStatus: s.sectionStatus,
      videoRenderEnabled: s.videoRenderEnabled,
      pipelineStatus: s.pipelineStatus,
      resumeGeneration: s.resumeGeneration,
    }))
  )

  const pid = projectId ?? state.savedProjectId
  const [jobId, setJobId] = useState<string | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [canResume, setCanResume] = useState(false)
  const restoredRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pid) return

    const stored = readStoredGenerationJobId(pid)
    if (stored) {
      if (isValidGenerationJobId(stored)) {
        setJobId(stored)
      } else {
        clearStaleGenerationJobReference({
          jobId: stored,
          projectId: pid,
          reason: 'invalid-id',
        })
      }
    }

    void fetchActiveGenerationJob(pid).then((job) => {
      if (!job) {
        const live = useQuickCutGenerationStore.getState()
        if (live.isGenerating && live.savedProjectId === pid) {
          return
        }
        if (stored && isValidGenerationJobId(stored)) {
          clearStaleGenerationJobReference({
            jobId: stored,
            projectId: pid,
            reason: '404',
            resetGenerationUi: !live.isGenerating,
          })
        } else if (stored) {
          clearStoredGenerationJobId(pid, stored)
        }
        setJobId(null)
        setCanResume(false)
        return
      }

      setJobId(job.jobId)
      setLabel(job.label)
      setProgress(job.progress)
      setCanResume(job.canResume)
      writeStoredGenerationJobId(pid, job.jobId)

      if (restoredRef.current !== `${pid}:${job.jobId}`) {
        restoredRef.current = `${pid}:${job.jobId}`
        applyActiveGenerationJobToStore(
          job,
          useQuickCutGenerationStore.getState,
          useQuickCutGenerationStore.setState,
          pid
        )
        const live = useQuickCutGenerationStore.getState()
        if (job.canResume && !live.isGenerating && !live.isComplete) {
          void live.resumeGeneration()
        }
      }
    })
  }, [pid])

  useEffect(() => {
    if (!pid || state.isComplete) return
    void syncGenerationJobProgress({
      jobId: isValidGenerationJobId(jobId) ? jobId : null,
      projectId: pid,
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
      pipelineStatus: state.pipelineStatus,
    }).then((nextId) => {
      if (nextId && isValidGenerationJobId(nextId)) {
        if (nextId !== jobId) setJobId(nextId)
        writeStoredGenerationJobId(pid, nextId)
        const live = useQuickCutGenerationStore.getState()
        if (live.pipelineJobId !== nextId) {
          useQuickCutGenerationStore.setState({ pipelineJobId: nextId, jobPollWarning: null })
        }
      }
    })
  }, [
    pid,
    jobId,
    state.generationStep,
    state.lastCompletedStep,
    state.isGenerating,
    state.isComplete,
    state.generationStatus,
    state.prompt,
  ])

  const resume = useCallback(() => {
    void state.resumeGeneration()
    setCanResume(false)
  }, [state.resumeGeneration])

  const showBanner =
    Boolean(pid) &&
    canResume &&
    !state.isGenerating &&
    !state.isComplete &&
    state.generationStatus !== 'failed'

  return { jobId, label, progress, canResume, showBanner, resume }
}
