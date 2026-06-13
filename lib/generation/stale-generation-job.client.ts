'use client'

import { clearStoredGenerationJobId } from '@/lib/generation/generation-job-session.client'
import { isValidGenerationJobId } from '@/lib/generation/generation-job-id'
import type { QuickCutGenerationState } from '@/stores/quick-cut-generation-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export { isValidGenerationJobId }

const loggedStaleJobs = new Set<string>()

export type StaleGenerationJobReason = '404' | 'invalid-id' | 'missing-payload'

/**
 * Clear stale job references from client state + session storage.
 * Logs once per stale job id to avoid console spam.
 */
export function clearStaleGenerationJobReference(input: {
  jobId: string
  projectId?: string | null
  reason: StaleGenerationJobReason
  /** When true, reset generation UI (default: only for invalid-id). */
  resetGenerationUi?: boolean
}): void {
  const { jobId, projectId, reason } = input
  const resetGenerationUi = input.resetGenerationUi ?? reason === 'invalid-id'

  if (!loggedStaleJobs.has(jobId)) {
    loggedStaleJobs.add(jobId)
    console.warn('[generation] stale job reference', { jobId, reason })
  }

  if (projectId) {
    clearStoredGenerationJobId(projectId, jobId)
  }

  const state = useQuickCutGenerationStore.getState()
  if (state.pipelineJobId !== jobId) return

  const patch: Partial<QuickCutGenerationState> = {
    pipelineJobId: null,
  }

  if (reason === 'invalid-id') {
    patch.jobPollWarning = 'Reconnecting generation job…'
  }

  if (resetGenerationUi && !state.isGenerating) {
    patch.isRenderingVideo = false
    patch.renderPollUrl = null
    if (reason === '404' || reason === 'missing-payload') {
      patch.renderError = 'Generation unavailable — start a new run when ready.'
    }
    if (!state.isComplete) {
      patch.generationStatus = 'pending'
    }
  }

  useQuickCutGenerationStore.setState(patch)
}
