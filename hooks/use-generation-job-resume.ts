'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  fetchActiveGenerationJob,
  syncGenerationJobProgress,
} from '@/lib/generation/generation-job-sync.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

const JOB_ID_KEY = 'mugtee:generation-job-id:v1'

function readJobId(projectId: string | null): string | null {
  if (typeof window === 'undefined' || !projectId) return null
  try {
    const raw = sessionStorage.getItem(JOB_ID_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, string>
    return map[projectId] ?? null
  } catch {
    return null
  }
}

function writeJobId(projectId: string, jobId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(JOB_ID_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    map[projectId] = jobId
    sessionStorage.setItem(JOB_ID_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

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
      resumeGeneration: s.resumeGeneration,
    }))
  )

  const pid = projectId ?? state.savedProjectId
  const [jobId, setJobId] = useState<string | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [canResume, setCanResume] = useState(false)
  useEffect(() => {
    if (!pid) return
    const stored = readJobId(pid)
    if (stored) setJobId(stored)

    void fetchActiveGenerationJob(pid).then((job) => {
      if (!job) return
      setJobId(job.jobId)
      setLabel(job.label)
      setProgress(job.progress)
      setCanResume(job.canResume)
      writeJobId(pid, job.jobId)
    })
  }, [pid])

  useEffect(() => {
    if (!pid || state.isComplete) return
    void syncGenerationJobProgress({
      jobId,
      projectId: pid,
      generationStep: state.generationStep,
      lastCompletedStep: state.lastCompletedStep,
      isGenerating: state.isGenerating,
      isComplete: state.isComplete,
      generationStatus: state.generationStatus,
      prompt: state.prompt,
    }).then((nextId) => {
      if (nextId && nextId !== jobId) {
        setJobId(nextId)
        writeJobId(pid, nextId)
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
