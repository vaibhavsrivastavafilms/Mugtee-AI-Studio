'use client'

import { exportStatusPollPath } from '@/lib/reels/export-paths'

export type ActiveExportResume = {
  active: boolean
  jobId?: string
  pollUrl?: string
  status?: string
  progress?: number
  label?: string
}

/** Fetch durable active export for page-refresh recovery. */
export async function fetchActiveExportForProject(
  projectId: string
): Promise<ActiveExportResume> {
  const res = await fetch(
    `/api/export/active?projectId=${encodeURIComponent(projectId)}`,
    { credentials: 'include' }
  )
  if (!res.ok) return { active: false }
  const data = (await res.json()) as ActiveExportResume & { jobId?: string }
  if (!data.active || !data.jobId) return { active: false }
  return {
    active: true,
    jobId: data.jobId,
    pollUrl: data.pollUrl ?? exportStatusPollPath(data.jobId, projectId),
    status: data.status,
    progress: data.progress,
    label: data.label,
  }
}
