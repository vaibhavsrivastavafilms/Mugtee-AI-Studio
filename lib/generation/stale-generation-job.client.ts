'use client'

import { clearStoredGenerationJobId } from '@/lib/generation/generation-job-session.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const loggedStaleJobs = new Set<string>()

/** Durable generation_jobs IDs are prefixed at creation time (see POST /api/generation/jobs). */
export function isValidGenerationJobId(jobId: string | null | undefined): jobId is string {
  if (!jobId?.trim()) return false
  return jobId.startsWith('gen_')
}

export type StaleGenerationJobReason = '404' | 'invalid-id' | 'missing-payload'

/**
 * Clear stale job references from client state + session storage.
 * Logs once per stale job id to avoid console spam.
 */
export function clearStaleGenerationJobReference(input: {
  jobId: string
  projectId?: string | null
  reason: StaleGenerationJobReason
}): void {
  const { jobId, projectId, reason } = input
  if (!loggedStaleJobs.has(jobId)) {
    loggedStaleJobs.add(jobId)
    console.warn('[generation] stale job reference', jobId)
    if (reason === '404') {
      console.warn('[generation] polling stopped', jobId)
    } else {
      console.warn('[generation] restore skipped', jobId)
    }
  }

  if (projectId) {
    clearStoredGenerationJobId(projectId, jobId)
  }

  const state = useQuickCutGenerationStore.getState()
  if (state.pipelineJobId !== jobId) return

  useQuickCutGenerationStore.setState({
    pipelineJobId: null,
    isGenerating: false,
    isRenderingVideo: false,
    renderPollUrl: null,
    renderError:
      reason === '404' || reason === 'missing-payload'
        ? 'Generation unavailable — start a new run when ready.'
        : state.renderError,
    generationStatus: state.isComplete ? state.generationStatus : 'pending',
  })
}
