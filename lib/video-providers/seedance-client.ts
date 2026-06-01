import { logError } from '@/lib/workspace/validation'

export type SeedanceTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | string

export type SeedanceGenerateResponse = {
  task_id?: string
  taskId?: string
  id?: string
}

export type SeedanceStatusResponse = {
  status?: SeedanceTaskStatus
  video_url?: string
  videoUrl?: string
  output_url?: string
  thumbnail_url?: string
  thumbnailUrl?: string
  error?: string
  message?: string
}

const DEFAULT_BASE = 'https://seedanceapi.org/v2'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getSeedanceApiKey(): string | undefined {
  return process.env.SEEDANCE_API_KEY?.trim() || undefined
}

export function hasSeedanceApiKey(): boolean {
  return Boolean(getSeedanceApiKey())
}

export function seedanceApiBase(): string {
  return (process.env.SEEDANCE_API_BASE?.trim() || DEFAULT_BASE).replace(/\/$/, '')
}

function seedanceHeaders(): HeadersInit {
  const key = getSeedanceApiKey()
  if (!key) throw new Error('SEEDANCE_API_KEY is not configured')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
}

function normalizeDuration(durationSec: number): 5 | 10 | 15 {
  if (durationSec <= 5) return 5
  if (durationSec <= 10) return 10
  return 15
}

export async function createSeedanceTask(input: {
  prompt: string
  imageUrl?: string | null
  durationSec?: number
  aspectRatio?: string
  model?: string
}): Promise<string> {
  const body: Record<string, unknown> = {
    prompt: input.prompt.slice(0, 900),
    duration: normalizeDuration(input.durationSec ?? 5),
    aspect_ratio: input.aspectRatio ?? '9:16',
    model: input.model ?? process.env.SEEDANCE_MODEL?.trim() ?? 'seedance-2.0',
  }

  if (input.imageUrl?.trim()) {
    body.images = [input.imageUrl.trim()]
  }

  const res = await fetch(`${seedanceApiBase()}/generate`, {
    method: 'POST',
    headers: seedanceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })

  const data = (await res.json().catch(() => ({}))) as SeedanceGenerateResponse & Record<string, unknown>
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : `Seedance API error (${res.status})`
    throw new Error(message)
  }

  const taskId =
    data.task_id ?? data.taskId ?? data.id ?? (data.data as Record<string, unknown> | undefined)?.task_id
  if (typeof taskId !== 'string' || !taskId.trim()) {
    throw new Error('Seedance API did not return a task id')
  }
  return taskId.trim()
}

export async function retrieveSeedanceTask(taskId: string): Promise<SeedanceStatusResponse> {
  const url = new URL(`${seedanceApiBase()}/status`)
  url.searchParams.set('task_id', taskId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: seedanceHeaders(),
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json().catch(() => ({}))) as SeedanceStatusResponse & Record<string, unknown>
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : `Seedance status lookup failed (${res.status})`
    throw new Error(message)
  }

  return data
}

export async function waitForSeedanceOutput(
  taskId: string,
  options?: { onProgress?: (label: string) => void; maxAttempts?: number }
): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const maxAttempts = options?.maxAttempts ?? 90

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(attempt === 0 ? 2000 : 4000 + Math.floor(Math.random() * 500))

    let task: SeedanceStatusResponse
    try {
      task = await retrieveSeedanceTask(taskId)
    } catch (err) {
      logError('seedance.poll', err)
      options?.onProgress?.('Seedance still processing…')
      continue
    }

    const status = String(task.status ?? '').toUpperCase()
    const videoUrl =
      task.video_url ??
      task.videoUrl ??
      task.output_url ??
      (typeof (task as Record<string, unknown>).output === 'string'
        ? ((task as Record<string, unknown>).output as string)
        : undefined)

    if (status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'COMPLETED') {
      if (!videoUrl?.trim()) throw new Error('Seedance task succeeded but returned no video URL')
      return {
        videoUrl: videoUrl.trim(),
        thumbnailUrl: task.thumbnail_url ?? task.thumbnailUrl ?? null,
      }
    }

    if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELED') {
      throw new Error(task.error?.trim() || task.message?.trim() || 'Seedance video generation failed')
    }

    options?.onProgress?.(
      status === 'RUNNING' || status === 'PROCESSING'
        ? 'Seedance generating cinematic clip…'
        : 'Waiting for Seedance…'
    )
  }

  throw new Error('Seedance video generation timed out')
}
