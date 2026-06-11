import { creatorFriendlyMessage } from '@/lib/errors/creator-friendly-errors'
import { fetchProjectReelDownload } from '@/lib/quick-cut/asset-availability'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { exportStatusPollPath, reelExportPollPath } from '@/lib/reels/export-paths'
import { EXPORT_STAGE_LABELS } from '@/lib/reels/export-stages'
import { friendlyReelRenderError } from '@/lib/video/reel-render-errors'

/** Client helpers for GET /api/reels/export/:jobId poll responses. */

export const REEL_EXPORT_PROGRESS_CAP = 95
/** UI + auto-retry when export appears stalled (e.g. stuck at render step %). */
export const REEL_EXPORT_STUCK_MS = 30_000
/** Hard client timeout for a single export poll session (15 min — matches Vercel maxDuration × retries). */
export const REEL_EXPORT_MAX_MS = 15 * 60 * 1000
export const REEL_EXPORT_STUCK_MSG =
  'Export taking longer than expected — Retry export'

const POLL_INTERVAL_MS = 1500
const FETCH_TIMEOUT_MS = 15_000
const FETCH_RETRY_DELAYS_MS = [800, 1600, 3200]
const DB_RECOVERY_EVERY_N_POLLS = 5

let activePollAbort: AbortController | null = null

/** Cancel the in-flight export poll (unmount / state reset). */
export function abortActiveReelExportPoll(): void {
  activePollAbort?.abort()
  activePollAbort = null
}

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('connection refused') ||
    msg.includes('load failed') ||
    msg.includes('err_connection_refused')
  )
}

/** Always poll same-origin relative paths — never a stale absolute host/port. */
export function normalizePollUrlToRelative(pollUrl: string): string {
  const trimmed = pollUrl.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const parsed = new URL(trimmed, base)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return trimmed
  }
}

export function capReelExportProgress(progress?: number): number | undefined {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return undefined
  return Math.min(REEL_EXPORT_PROGRESS_CAP, Math.max(0, Math.round(progress)))
}

export function normalizeReelExportPollUrl(
  pollUrl: string,
  projectId?: string | null
): string {
  const relative = normalizePollUrlToRelative(pollUrl)
  if (!projectId?.trim()) return relative
  try {
    const url = new URL(relative, 'http://local')
    if (!url.searchParams.has('projectId')) {
      url.searchParams.set('projectId', projectId.trim())
    }
    return `${url.pathname}${url.search}`
  } catch {
    const jobId = relative.split('/').pop()?.split('?')[0]
    return jobId ? reelExportPollPath(jobId, projectId) : relative
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
    label:
      typeof job.label === 'string' && job.label.trim()
        ? job.label
        : mapPollStatusToStageLabel(status),
    reelUrl,
    error: typeof job.error === 'string' ? job.error : null,
  }
}

function mapPollStatusToStageLabel(status: ReelExportPollStatus): string {
  switch (status) {
    case 'queued':
    case 'pending':
      return EXPORT_STAGE_LABELS.preparing
    case 'rendering':
      return EXPORT_STAGE_LABELS.encoding
    case 'uploading':
      return EXPORT_STAGE_LABELS.uploading
    case 'completed':
      return EXPORT_STAGE_LABELS.ready
    case 'failed':
      return EXPORT_STAGE_LABELS.failed
    default:
      return EXPORT_STAGE_LABELS.preparing
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
  const externalSignal = init?.signal
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

function resolveDurablePollUrl(pollUrl: string, projectId?: string | null): string {
  try {
    const url = new URL(pollUrl, 'http://local')
    const segments = url.pathname.split('/').filter(Boolean)
    const jobId = segments[segments.length - 1]
    if (jobId && (url.pathname.includes('/api/reels/export/') || segments.includes('export'))) {
      return exportStatusPollPath(jobId, projectId)
    }
  } catch {
    /* use original */
  }
  return pollUrl
}

async function fetchPollJson(
  pollUrl: string,
  projectId?: string | null,
  signal?: AbortSignal
): Promise<{ res: Response; raw: Record<string, unknown> }> {
  const durableUrl = resolveDurablePollUrl(pollUrl, projectId)
  const urlsToTry = durableUrl === pollUrl ? [pollUrl] : [durableUrl, pollUrl]
  let lastError: unknown = null
  for (let attempt = 0; attempt <= FETCH_RETRY_DELAYS_MS.length; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Export poll aborted', 'AbortError')
    }
    if (attempt > 0) {
      await sleep(FETCH_RETRY_DELAYS_MS[attempt - 1] ?? 3200)
    }
    for (const url of urlsToTry) {
      try {
        const res = await fetchWithTimeout(url, { credentials: 'include', signal })
        let raw: Record<string, unknown> = {}
        try {
          raw = (await res.json()) as Record<string, unknown>
        } catch {
          raw = {}
        }
        console.log('[export-poll]', {
          reelId: url.split('/').pop()?.split('?')[0] ?? null,
          endpoint: url,
          responseStatus: res.status,
          responseBody: raw,
        })
        if (res.ok || res.status !== 404) {
          return { res, raw }
        }
      } catch (err) {
        lastError = err
        console.error('EXPORT FETCH FAILED', {
          endpoint: url,
          error: err instanceof Error ? err.message : err,
        })
        if (isNetworkFetchError(err)) {
          throw err instanceof Error
            ? err
            : new Error(creatorFriendlyMessage(err, 'export'))
        }
      }
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
    signal?: AbortSignal
  }
): Promise<string> {
  abortActiveReelExportPoll()
  const controller = new AbortController()
  activePollAbort = controller
  const signal = options?.signal
  const onExternalAbort = () => controller.abort()
  signal?.addEventListener('abort', onExternalAbort)

  const startedAt = options?.startedAt ?? Date.now()
  const maxAttempts = options?.maxAttempts ?? maxPollAttempts(REEL_EXPORT_MAX_MS)
  const resolvedPollUrl = normalizeReelExportPollUrl(pollUrl, options?.projectId)

  try {
  for (let i = 0; i < maxAttempts; i++) {
    if (controller.signal.aborted) {
      throw new DOMException('Export poll aborted', 'AbortError')
    }
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

    const { res, raw } = await fetchPollJson(
      resolvedPollUrl,
      options?.projectId,
      controller.signal
    )

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
      const formatError =
        typeof friendlyReelRenderError === 'function'
          ? friendlyReelRenderError
          : (raw: string | null | undefined) => raw?.trim() || 'Export failed'
      throw new Error(formatError(job.error))
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
  } finally {
    signal?.removeEventListener('abort', onExternalAbort)
    if (activePollAbort === controller) {
      activePollAbort = null
    }
  }
}

export function isReelExportStuck(startedAt: number | null | undefined): boolean {
  if (!startedAt) return false
  return Date.now() - startedAt >= REEL_EXPORT_STUCK_MS
}
