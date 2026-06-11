'use client'

/**
 * Legacy auto-resume hook — superseded by useReelPipelineJobPoll.
 * Kept as no-op stub so existing imports do not spawn duplicate export polls.
 */
export function useReelExportAutoResume(_options?: { enabled?: boolean }) {
  /* polling centralized on GET /api/generation/jobs/[jobId] via useReelPipelineJobPoll */
}
