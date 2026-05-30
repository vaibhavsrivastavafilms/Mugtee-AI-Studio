import { fetchProjectReelDownload } from '@/lib/quick-cut/asset-availability'

/** Client helpers for GET /api/reels/export/:jobId poll responses. */

export type ReelExportPollStatus =
  | 'pending'
  | 'queued'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'failed'

export type ReelExportPollResult = {
  status: ReelExportPollStatus
  progress: number
  label?: string
  reelUrl?: string | null
  error?: string | null
}

export function parseReelExportPoll(
  job: Record<string, unknown>
): ReelExportPollResult {
  const legacyStatus = typeof job.status === 'string' ? job.status : 'queued'
  const status = (
    legacyStatus === 'done'
      ? 'completed'
      : legacyStatus === 'running'
        ? 'rendering'
        : legacyStatus
  ) as ReelExportPollStatus

  const progress =
    typeof job.progress === 'number'
      ? job.progress
      : typeof job.percent === 'number'
        ? job.percent
        : 0

  const reelUrl =
    (typeof job.reelUrl === 'string' && job.reelUrl) ||
    (typeof job.videoUrl === 'string' && job.videoUrl) ||
    null

  return {
    status,
    progress,
    label: typeof job.label === 'string' ? job.label : undefined,
    reelUrl,
    error: typeof job.error === 'string' ? job.error : null,
  }
}

export async function pollReelExportJob(
  pollUrl: string,
  options?: {
    maxAttempts?: number
    projectId?: string | null
    onProgress?: (patch: { label?: string; progress?: number }) => void
  }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 120
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const res = await fetch(pollUrl, { credentials: 'include' })
    const raw = (await res.json()) as Record<string, unknown>

    if (res.status === 404) {
      if (options?.projectId) {
        const recovered = await fetchProjectReelDownload(options.projectId)
        if (recovered.reelUrl) return recovered.reelUrl
      }
      throw new Error('Export job expired — retry export')
    }
    if (!res.ok) {
      throw new Error(String(raw?.error || 'Export status unavailable'))
    }

    const job = parseReelExportPoll(raw)
    options?.onProgress?.({ label: job.label, progress: job.progress })

    if (job.status === 'failed') {
      throw new Error(job.error || 'Reel export failed')
    }

    if (job.status === 'completed' && job.reelUrl) {
      return job.reelUrl
    }
  }
  throw new Error('Reel export timed out — try again')
}
