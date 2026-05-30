/** Shared poll/download path builders (safe for client + server). */

export function reelExportPollPath(jobId: string, projectId?: string | null): string {
  const base = `/api/reels/export/${encodeURIComponent(jobId)}`
  if (!projectId?.trim()) return base
  return `${base}?projectId=${encodeURIComponent(projectId.trim())}`
}
