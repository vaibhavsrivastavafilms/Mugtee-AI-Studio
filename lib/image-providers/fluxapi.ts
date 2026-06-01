import 'server-only'

/** Flux Kontext REST API — https://docs.fluxapi.ai/quickstart */
const FLUXAPI_BASE = 'https://api.fluxapi.ai/api/v1/flux/kontext'
/** API model ids (not the marketing name "flux-1-kontext-dev"). */
const DEFAULT_MODEL = 'flux-kontext-pro'
const DEFAULT_ASPECT = '9:16'
const POLL_INTERVAL_MS = 3_000
const DEFAULT_MAX_POLL_ATTEMPTS = 40

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getFluxApiKey(): string | undefined {
  return (
    process.env.FLUXAPI_KEY?.trim() ||
    process.env.FLUX_API_KEY?.trim() ||
    undefined
  )
}

export function hasFluxApiKey(): boolean {
  return Boolean(getFluxApiKey())
}

type FluxApiEnvelope<T> = {
  code?: number
  msg?: string
  data?: T
}

type FluxTaskStatus = {
  successFlag?: number
  errorMessage?: string
  errorCode?: string
  response?: {
    resultImageUrl?: string
    originImageUrl?: string
  }
}

export type FluxKontextOptions = {
  aspectRatio?: string
  model?: string
  outputFormat?: 'jpeg' | 'png'
  promptUpsampling?: boolean
}

export async function createFluxKontextTask(
  prompt: string,
  options?: FluxKontextOptions
): Promise<string | null> {
  const key = getFluxApiKey()
  if (!key) return null

  const promptUpsamplingEnv = process.env.FLUXAPI_PROMPT_UPSAMPLING?.trim().toLowerCase()
  const promptUpsampling =
    options?.promptUpsampling ??
    (promptUpsamplingEnv === 'true' || promptUpsamplingEnv === '1')

  const res = await fetch(`${FLUXAPI_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      aspectRatio: options?.aspectRatio ?? process.env.FLUXAPI_ASPECT_RATIO?.trim() ?? DEFAULT_ASPECT,
      model: options?.model ?? process.env.FLUXAPI_MODEL?.trim() ?? DEFAULT_MODEL,
      enableTranslation: true,
      outputFormat: options?.outputFormat ?? 'jpeg',
      ...(promptUpsampling ? { promptUpsampling: true } : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const json = (await res.json().catch(() => null)) as FluxApiEnvelope<{ taskId?: string }> | null
  if (!res.ok || json?.code !== 200) {
    console.error('[IMAGE_ERROR] fluxapi', {
      status: res.status,
      msg: json?.msg?.slice(0, 200),
    })
    return null
  }

  const taskId = json?.data?.taskId?.trim()
  if (!taskId) {
    console.error('[IMAGE_ERROR] fluxapi', { reason: 'no taskId in response' })
    return null
  }
  return taskId
}

export async function retrieveFluxKontextTask(taskId: string): Promise<FluxTaskStatus | null> {
  const key = getFluxApiKey()
  if (!key) return null

  const url = new URL(`${FLUXAPI_BASE}/record-info`)
  url.searchParams.set('taskId', taskId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  })

  const json = (await res.json().catch(() => null)) as FluxApiEnvelope<FluxTaskStatus> | null
  if (!res.ok || json?.code !== 200) return null
  return json?.data ?? null
}

export async function waitForFluxKontextImage(
  taskId: string,
  options?: { maxAttempts?: number }
): Promise<string | null> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(POLL_INTERVAL_MS)

    const status = await retrieveFluxKontextTask(taskId)
    if (!status) continue

    const flag = status.successFlag
    if (flag === 1) {
      const url =
        status.response?.resultImageUrl?.trim() ||
        status.response?.originImageUrl?.trim()
      return url || null
    }
    if (flag === 2 || flag === 3) {
      console.error('[IMAGE_ERROR] fluxapi', {
        successFlag: flag,
        errorMessage: status.errorMessage?.slice(0, 200),
        errorCode: status.errorCode,
      })
      return null
    }
  }

  console.error('[IMAGE_ERROR] fluxapi', { reason: 'poll timeout', taskId: taskId.slice(0, 24) })
  return null
}

/** Generate an image via FluxAPI.ai Kontext (async task + poll). */
export async function generateFluxApiImage(
  prompt: string,
  options?: FluxKontextOptions
): Promise<string | null> {
  const taskId = await createFluxKontextTask(prompt, options)
  if (!taskId) return null
  return waitForFluxKontextImage(taskId)
}
