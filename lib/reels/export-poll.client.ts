import { creatorFriendlyMessage } from '@/lib/errors/creator-friendly-errors'
import { fetchProjectReelDownload } from '@/lib/quick-cut/asset-availability'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { reelExportPollPath } from '@/lib/reels/export-paths'

/** Client helpers for GET /api/reels/export/:jobId poll responses. */

export const REEL_EXPORT_PROGRESS_CAP = 95
/** UI + auto-retry when export appears stalled (e.g. stuck at render step %). */
export const REEL_EXPORT_STUCK_MS = 30_000
/** Hard client timeout for a single export poll session. */
export const REEL_EXPORT_MAX_MS = 5 * 60 * 1000
export const REEL_EXPORT_STUCK_MSG =
  'Export taking longer than expected — Retry export'

const POLL_INTERVAL_MS = 1500
const FETCH_TIMEOUT_MS = 15_000
const FETCH_RETRY_DELAYS_MS = [800, 1600, 3200]
const DB_RECOVERY_EVERY_N_POLLS = 5

export function capReelExportProgress(progress?: number): number | undefined {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return undefined
  return Math.min(REEL_EXPORT_PROGRESS_CAP, Math.max(0, Math.round(progress)))
}

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

  const rawProgress =
    typeof job.progress === 'number'
      ? job.progress
      : typeof job.percent === 'number'
        ? job.percent
        : 0

  const progress = capReelExportProgress(rawProgress) ?? 0

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

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
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
      const res = await fetchWithTimeout(pollUrl, { credentials: 'include' })
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

function maxPollAttempts(maxMs: number): number {
  return Math.max(1, Math.ceil(maxMs / POLL_INTERVAL_MS))
}

export async function pollReelExportJob(
  pollUrl: string,
  options?: {
    maxAttempts?: number
    projectId?: string | null
    onProgress?: (patch: { label?: string; progress?: number; stuck?: boolean }) => void
    startedAt?: number
  }
): Promise<string> {
  const startedAt = options?.startedAt ?? Date.now()
  const maxAttempts = options?.maxAttempts ?? maxPollAttempts(REEL_EXPORT_MAX_MS)
  const resolvedPollUrl = normalizeReelExportPollUrl(pollUrl, options?.projectId)

  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await sleep(POLL_INTERVAL_MS)

    const elapsed = Date.now() - startedAt
    if (elapsed >= REEL_EXPORT_MAX_MS) {
      const url = await recoverFromDb(options?.projectId)
      if (url) {
        options?.onProgress?.({ progress: 100 })
        return url
      }
      throw new Error(creatorFriendlyMessage('Reel export timed out — try again', 'export'))
    }

    if (
      elapsed >= REEL_EXPORT_STUCK_MS &&
      i > 0 &&
      i % DB_RECOVERY_EVERY_N_POLLS === 0
    ) {
      const url = await recoverFromDb(options?.projectId)
      if (url) {
        options?.onProgress?.({ progress: 100 })
        return url
      }
    }

    const { res, raw } = await fetchPollJson(resolvedPollUrl, options?.projectId)

    if (res.status === 404) {
      const url = await recoverFromDb(options?.projectId)
      if (url) {
        options?.onProgress?.({ progress: 100 })
        return url
      }
      throw new Error('Export job expired — retry export')
    }

    if (!res.ok) {
      const url = await recoverFromDb(options?.projectId)
      if (url) {
        options?.onProgress?.({ progress: 100 })
        return url
      }
      throw new Error(creatorFriendlyMessage({ status: res.status }, 'export'))
    }

    const job = parseReelExportPoll(raw)
    options?.onProgress?.({
      label: job.label,
      progress: job.progress,
      stuck: elapsed >= REEL_EXPORT_STUCK_MS,
    })

    if (job.status === 'failed') {
      throw new Error(creatorFriendlyMessage(job.error, 'export'))
    }

    if (job.status === 'completed' && job.reelUrl) {
      if (isValidReelDownloadUrl(job.reelUrl)) {
        options?.onProgress?.({ progress: 100 })
        return job.reelUrl
      }
      const url = await recoverFromDb(options?.projectId)
      if (url) {
        options?.onProgress?.({ progress: 100 })
        return url
      }
      continue
    }

    if (
      (job.status === 'rendering' || job.status === 'uploading') &&
      i > 0 &&
      i % DB_RECOVERY_EVERY_N_POLLS === 0
    ) {
      const url = await recoverFromDb(options?.projectId)
      if (url) {
        options?.onProgress?.({ progress: 100 })
        return url
      }
    }
  }

  const url = await recoverFromDb(options?.projectId)
  if (url) {
    options?.onProgress?.({ progress: 100 })
    return url
  }

  throw new Error(creatorFriendlyMessage('Reel export timed out — try again', 'export'))
}

export function isReelExportStuck(startedAt: number | null | undefined): boolean {
  if (!startedAt) return false
  return Date.now() - startedAt >= REEL_EXPORT_STUCK_MS
}
