import { logError } from '@/lib/workspace/validation'

/** Official Runway API base — https://docs.dev.runwayml.com/guides/using-the-api/ */
export const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1'
export const RUNWAY_API_VERSION = '2024-11-06'

/** Gen-4.5 image/text-to-video — https://docs.dev.runwayml.com/api-details/api_changelog/ */
export const RUNWAY_DEFAULT_MODEL = process.env.RUNWAY_MODEL?.trim() || 'gen4.5'

/** Gen-4.5 supports 2–10 second clips per task. */
export const RUNWAY_MIN_DURATION_SEC = 2
export const RUNWAY_MAX_DURATION_SEC = 10

/** Vertical 9:16 for Quick Cut / cinematic reels. */
export const RUNWAY_VERTICAL_RATIO = '720:1280'

export type RunwayTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'THROTTLED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'

export type RunwayTask = {
  id: string
  status: RunwayTaskStatus
  output?: string[]
  failure?: string
  failureCode?: string
}

export type RunwayVideoInput = {
  promptText: string
  promptImage?: string | null
  durationSec?: number
  ratio?: string
  model?: string
  onProgress?: (label: string) => void
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Scene video clips: RUNWAY_API_KEY or RUNWAYML_API_SECRET; optional RUNWAY_MODEL, VIDEO_GENERATION_PROVIDER=runway */
/** Primary env var per product spec; official Runway docs use RUNWAYML_API_SECRET. */
export function getRunwayApiKey(): string | undefined {
  return (
    process.env.RUNWAY_API_KEY?.trim() ||
    process.env.RUNWAYML_API_SECRET?.trim() ||
    undefined
  )
}

export function hasRunwayApiKey(): boolean {
  return Boolean(getRunwayApiKey())
}

export function resolveRunwayVideoProvider(): 'runway' | 'ffmpeg' {
  if (!hasRunwayApiKey()) return 'ffmpeg'
  const forced = process.env.VIDEO_RENDER_PROVIDER?.trim().toLowerCase()
  if (forced === 'ffmpeg') return 'ffmpeg'
  if (forced === 'runway' && hasRunwayApiKey()) return 'runway'
  return hasRunwayApiKey() ? 'runway' : 'ffmpeg'
}

export function clampRunwayDuration(durationSec?: number): number {
  const raw = durationSec ?? 5
  return Math.max(
    RUNWAY_MIN_DURATION_SEC,
    Math.min(RUNWAY_MAX_DURATION_SEC, Math.round(raw))
  )
}

function runwayHeaders(): HeadersInit {
  const key = getRunwayApiKey()
  if (!key) throw new Error('RUNWAY_API_KEY is not configured')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'X-Runway-Version': RUNWAY_API_VERSION,
  }
}

async function runwayFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${RUNWAY_API_BASE}${path}`, {
    ...init,
    headers: {
      ...runwayHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(120_000),
  })
  return res
}

/** POST /v1/image_to_video — image-to-video or text-to-video when promptImage is omitted. */
export async function createRunwayVideoTask(
  input: RunwayVideoInput
): Promise<string> {
  const body: Record<string, unknown> = {
    model: input.model ?? RUNWAY_DEFAULT_MODEL,
    promptText: input.promptText.slice(0, 1000),
    ratio: input.ratio ?? RUNWAY_VERTICAL_RATIO,
    duration: clampRunwayDuration(input.durationSec),
  }
  if (input.promptImage?.trim()) {
    body.promptImage = input.promptImage.trim()
  }

  const res = await runwayFetch('/image_to_video', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : `Runway API error (${res.status})`
    throw new Error(message)
  }

  const taskId = typeof data.id === 'string' ? data.id : null
  if (!taskId) throw new Error('Runway API did not return a task id')
  return taskId
}

/** GET /v1/tasks/:id — https://docs.dev.runwayml.com/assets/outputs/ */
export async function retrieveRunwayTask(taskId: string): Promise<RunwayTask> {
  const res = await runwayFetch(`/tasks/${encodeURIComponent(taskId)}`)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : `Runway task lookup failed (${res.status})`
    throw new Error(message)
  }

  return {
    id: String(data.id ?? taskId),
    status: String(data.status ?? 'PENDING') as RunwayTaskStatus,
    output: Array.isArray(data.output)
      ? data.output.filter((u): u is string => typeof u === 'string')
      : undefined,
    failure: typeof data.failure === 'string' ? data.failure : undefined,
    failureCode: typeof data.failureCode === 'string' ? data.failureCode : undefined,
  }
}

export async function waitForRunwayTaskOutput(
  taskId: string,
  options?: { onProgress?: (label: string) => void; maxAttempts?: number }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 120

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const jitter = Math.floor(Math.random() * 1000)
    await delay(5000 + jitter)

    let task: RunwayTask
    try {
      task = await retrieveRunwayTask(taskId)
    } catch (err) {
      logError('runway.poll', err)
      options?.onProgress?.('Runway still processing…')
      continue
    }

    if (task.status === 'SUCCEEDED') {
      const url = task.output?.[0]
      if (!url) throw new Error('Runway task succeeded but returned no video URL')
      return url
    }

    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(
        task.failure?.trim() ||
          `Runway video generation ${task.status.toLowerCase()}`
      )
    }

    options?.onProgress?.(
      task.status === 'RUNNING'
        ? 'Runway generating cinematic motion…'
        : 'Waiting for Runway…'
    )
  }

  throw new Error('Runway video generation timed out')
}

/** Create a Runway task and poll until a temporary output URL is ready. */
export async function generateRunwayVideo(
  input: RunwayVideoInput
): Promise<{ taskId: string; videoUrl: string }> {
  const taskId = await createRunwayVideoTask(input)
  const videoUrl = await waitForRunwayTaskOutput(taskId, {
    onProgress: input.onProgress,
  })
  return { taskId, videoUrl }
}
