/** Shared poll/download path builders (safe for client + server). */

export function reelExportPollPath(jobId: string, projectId?: string | null): string {
  const base = `/api/reels/export/${encodeURIComponent(jobId)}`
  if (!projectId?.trim()) return base
  return `${base}?projectId=${encodeURIComponent(projectId.trim())}`
}

/** Durable export_jobs poll (additive; legacy reel path still works). */
export function exportStatusPollPath(jobId: string, projectId?: string | null): string {
  const base = `/api/export/status/${encodeURIComponent(jobId)}`
  if (!projectId?.trim()) return base
  return `${base}?projectId=${encodeURIComponent(projectId.trim())}`
}
