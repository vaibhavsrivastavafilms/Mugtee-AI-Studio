import { creatorFriendlyMessage } from '@/lib/errors/creator-friendly-errors'
import { fetchProjectReelDownload } from '@/lib/quick-cut/asset-availability'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { reelExportPollPath } from '@/lib/reels/export-paths'

/** Client helpers for GET /api/reels/export/:jobId poll responses. */

export function normalizeReelExportPollUrl(
  pollUrl: string,
  projectId?: string | null
): string {
  if (!projectId?.trim()) return pollUrl
  try {
    const url = new URL(pollUrl, 'http://local')
    if (!url.searchParams.has('projectId')) {
      url.searchParams.set('projectId', projectId.trim())
    }
    return `${url.pathname}${url.search}`
  } catch {
    const jobId = pollUrl.split('/').pop()?.split('?')[0]
    return jobId ? reelExportPollPath(jobId, projectId) : pollUrl
  }
}

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

const POLL_INTERVAL_MS = 1500
const FETCH_RETRY_DELAYS_MS = [800, 1600, 3200]

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

async function fetchPollJson(
  pollUrl: string,
  projectId?: string | null
): Promise<{ res: Response; raw: Record<string, unknown> }> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= FETCH_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(FETCH_RETRY_DELAYS_MS[attempt - 1] ?? 3200)
    }
    try {
      const res = await fetch(pollUrl, { credentials: 'include' })
      let raw: Record<string, unknown> = {}
      try {
        raw = (await res.json()) as Record<string, unknown>
      } catch {
        raw = {}
      }
      return { res, raw }
    } catch (err) {
      lastError = err
    }
  }

  if (projectId?.trim()) {
    const recovered = await fetchProjectReelDownload(projectId)
    if (recovered.reelUrl && isValidReelDownloadUrl(recovered.reelUrl)) {
      return {
        res: new Response(JSON.stringify({ status: 'completed', reelUrl: recovered.reelUrl }), {
          status: 200,
        }),
        raw: { status: 'completed', reelUrl: recovered.reelUrl },
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(creatorFriendlyMessage(lastError, 'export'))
}

async function recoverFromDb(projectId?: string | null): Promise<string | null> {
  if (!projectId?.trim()) return null
  const recovered = await fetchProjectReelDownload(projectId)
  if (recovered.reelUrl && isValidReelDownloadUrl(recovered.reelUrl)) {
    return recovered.reelUrl
  }
  return null
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
  const resolvedPollUrl = normalizeReelExportPollUrl(pollUrl, options?.projectId)

  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await sleep(POLL_INTERVAL_MS)

    const { res, raw } = await fetchPollJson(resolvedPollUrl, options?.projectId)

    if (res.status === 404) {
      const url = await recoverFromDb(options?.projectId)
      if (url) return url
      throw new Error('Export job expired — retry export')
    }

    if (!res.ok) {
      const url = await recoverFromDb(options?.projectId)
      if (url) return url
      throw new Error(creatorFriendlyMessage({ status: res.status }, 'export'))
    }

    const job = parseReelExportPoll(raw)
    options?.onProgress?.({ label: job.label, progress: job.progress })

    if (job.status === 'failed') {
      throw new Error(creatorFriendlyMessage(job.error, 'export'))
    }

    if (job.status === 'completed' && job.reelUrl) {
      if (isValidReelDownloadUrl(job.reelUrl)) {
        return job.reelUrl
      }
      continue
    }
  }

  const url = await recoverFromDb(options?.projectId)
  if (url) return url

  throw new Error(creatorFriendlyMessage('Reel export timed out — try again', 'export'))
}
