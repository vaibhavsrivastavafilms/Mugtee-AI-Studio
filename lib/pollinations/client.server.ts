import 'server-only'

import { PollinationsError } from '@/lib/pollinations/errors.server'
import {
  assertPollinationsVideoAffordable,
  clearPollinationsSpendableBalanceCache,
  parsePollinationsPaymentRequired,
  setPollinationsSpendableBalanceCache,
} from '@/lib/pollinations/entitlement.server'
import {
  capPollinationsVideoDimensions,
  resolvePollinationsVideoImageUrl,
} from '@/lib/pollinations/image-url.server'
import {
  GEN_POLLINATIONS_BASE,
  hasPollinationsApiKey,
  invalidatePollinationsModelCache,
  pollinationsAuthHeaders,
  readPollinationsApiKey,
  selectBestPollinationsModel,
} from '@/lib/pollinations/models.server'

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const TERMINAL_POLLINATIONS_CODES = new Set<PollinationsError['code']>([
  'POLLINATIONS_AUTH_FAILED',
  'POLLINATIONS_CREDITS_EXHAUSTED',
  'POLLINATIONS_CREDITS_REQUIRED',
  'POLLINATIONS_MODEL_UNAVAILABLE',
  'POLLINATIONS_IMAGE_URL_INVALID',
  'POLLINATIONS_VIDEO_INVALID',
])
const MAX_ATTEMPTS = 3

function logPollinations(message: string, extra?: Record<string, unknown>): void {
  console.info('[pollinations]', message, extra ?? {})
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function requirePollinationsKey(capability: 'image' | 'video' | 'audio'): void {
  if (hasPollinationsApiKey()) return
  throw new PollinationsError({
    code: 'POLLINATIONS_AUTH_FAILED',
    message: `Pollinations ${capability} requires POLLINATIONS_API_KEY`,
    action: 'Get a secret key (sk_…) at https://enter.pollinations.ai/keys',
  })
}

function mapHttpError(params: {
  res: Response
  capability: 'image' | 'video' | 'audio'
  model: string
  sceneNumber?: number
  bodyText?: string
}): PollinationsError {
  const { res, capability, model, sceneNumber, bodyText } = params

  if (res.status === 401 || res.status === 403) {
    return new PollinationsError({
      code: 'POLLINATIONS_AUTH_FAILED',
      message: 'Pollinations authentication failed — check POLLINATIONS_API_KEY',
      httpStatus: res.status,
      model,
      sceneNumber,
      action: 'Get or rotate your key at https://enter.pollinations.ai/keys',
    })
  }

  if (res.status === 402) {
    const parsed = bodyText ? parsePollinationsPaymentRequired(bodyText) : { availableBalance: null, estimatedCost: null }
    if (parsed.availableBalance != null) {
      setPollinationsSpendableBalanceCache(parsed.availableBalance)
    }
    return new PollinationsError({
      code: 'POLLINATIONS_CREDITS_EXHAUSTED',
      message:
        parsed.availableBalance != null
          ? `Insufficient Pollen balance (available ${parsed.availableBalance.toFixed(4)})`
          : 'Insufficient Pollen balance',
      httpStatus: res.status,
      model,
      sceneNumber,
      action: 'Top up pollen at https://enter.pollinations.ai',
    })
  }

  if (res.status === 429) {
    return new PollinationsError({
      code: 'POLLINATIONS_RATE_LIMITED',
      message: 'Pollinations rate limited',
      httpStatus: res.status,
      model,
      sceneNumber,
    })
  }

  if (res.status === 404) {
    return new PollinationsError({
      code: 'POLLINATIONS_MODEL_UNAVAILABLE',
      message: `Pollinations ${capability} model unavailable (404)`,
      httpStatus: res.status,
      model,
      sceneNumber,
    })
  }

  const code =
    capability === 'image'
      ? 'POLLINATIONS_IMAGE_FAILED'
      : capability === 'video'
        ? 'POLLINATIONS_VIDEO_GENERATION_FAILED'
        : 'POLLINATIONS_GENERATION_FAILED'

  return new PollinationsError({
    code,
    message: `Pollinations ${capability} failed (${res.status})`,
    httpStatus: res.status,
    model,
    sceneNumber,
  })
}

function isRetryablePollinationsError(err: unknown): boolean {
  if (!(err instanceof PollinationsError)) return false
  if (TERMINAL_POLLINATIONS_CODES.has(err.code)) return false
  if (err.code === 'POLLINATIONS_RATE_LIMITED') return true
  const status = err.httpStatus
  return status != null && RETRYABLE_STATUSES.has(status)
}

export { hasPollinationsApiKey, readPollinationsApiKey } from '@/lib/pollinations/models.server'

export async function fetchPollinationsImageBuffer(params: {
  prompt: string
  width?: number
  height?: number
  seed?: number
  model?: string
  productionId?: string
  sceneNumber?: number
  maxAttempts?: number
}): Promise<{ buffer: Buffer; contentType: string; model: string }> {
  requirePollinationsKey('image')

  let model = params.model ?? (await selectBestPollinationsModel('image'))
  const url = new URL(`${GEN_POLLINATIONS_BASE}/image/${encodeURIComponent(params.prompt.slice(0, 4000))}`)
  url.searchParams.set('model', model)
  if (params.width) url.searchParams.set('width', String(params.width))
  if (params.height) url.searchParams.set('height', String(params.height))
  if (params.seed != null) url.searchParams.set('seed', String(params.seed))

  const started = Date.now()
  logPollinations('image request start', {
    provider: 'pollinations',
    capability: 'image',
    model,
    productionId: params.productionId ?? null,
    scene: params.sceneNumber ?? null,
  })

  let lastError: PollinationsError | null = null
  const maxAttempts = Math.max(1, Math.min(MAX_ATTEMPTS, params.maxAttempts ?? MAX_ATTEMPTS))

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    url.searchParams.set('model', model)
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'image/*', ...pollinationsAuthHeaders() },
        signal: AbortSignal.timeout(120_000),
      })

      if (!res.ok) {
        const bodyText = await res.text()
        const mapped = mapHttpError({
          res,
          capability: 'image',
          model,
          sceneNumber: params.sceneNumber,
          bodyText,
        })
        if (isRetryablePollinationsError(mapped) && attempt < maxAttempts) {
          if (res.status === 429) {
            invalidatePollinationsModelCache()
            model = await selectBestPollinationsModel('image')
          }
          lastError = mapped
          await sleep(1000 * attempt)
          continue
        }
        throw mapped
      }

      const contentType = res.headers.get('content-type') ?? 'image/jpeg'
      if (!contentType.includes('image')) {
        throw new PollinationsError({
          code: 'POLLINATIONS_IMAGE_FAILED',
          message: 'Pollinations returned non-image response',
          model,
          sceneNumber: params.sceneNumber,
        })
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 512) {
        throw new PollinationsError({
          code: 'POLLINATIONS_IMAGE_FAILED',
          message: 'Pollinations returned empty image',
          model,
          sceneNumber: params.sceneNumber,
        })
      }

      logPollinations('image request complete', {
        provider: 'pollinations',
        capability: 'image',
        model,
        productionId: params.productionId ?? null,
        scene: params.sceneNumber ?? null,
        durationMs: Date.now() - started,
        bytes: buffer.length,
        attempt,
      })

      return { buffer, contentType, model }
    } catch (err) {
      if (err instanceof PollinationsError) {
        throw err
      }
      if (attempt < maxAttempts) {
        lastError = new PollinationsError({
          code: 'POLLINATIONS_IMAGE_FAILED',
          message: err instanceof Error ? err.message : 'Pollinations image network error',
          model,
          sceneNumber: params.sceneNumber,
        })
        await sleep(1000 * attempt)
        continue
      }
      throw err
    }
  }

  throw lastError ?? new PollinationsError({ code: 'POLLINATIONS_IMAGE_FAILED', message: 'Pollinations image failed' })
}

export async function fetchPollinationsImageDataUrl(
  prompt: string,
  options?: { width?: number; height?: number; seed?: number; model?: string; maxAttempts?: number }
): Promise<string> {
  const result = await fetchPollinationsImageBuffer({
    prompt,
    width: options?.width,
    height: options?.height,
    seed: options?.seed,
    model: options?.model,
    maxAttempts: options?.maxAttempts,
  })
  const mime = result.contentType.split(';')[0]?.trim() || 'image/jpeg'
  return `data:${mime};base64,${result.buffer.toString('base64')}`
}

export async function fetchPollinationsVideoBuffer(params: {
  prompt: string
  imageUrl: string
  durationSec?: number
  aspectRatio?: string
  width?: number
  height?: number
  model?: string
  productionId?: string
  sceneNumber?: number
}): Promise<{ buffer: Buffer; model: string }> {
  requirePollinationsKey('video')

  const publicImageUrl = await resolvePollinationsVideoImageUrl({
    imageUrl: params.imageUrl,
    sceneNumber: params.sceneNumber,
  })

  const capped = capPollinationsVideoDimensions(params.width ?? 720, params.height ?? 1280)
  const durationSec = Math.max(2, Math.min(15, Math.round(params.durationSec ?? 5)))

  const preflight = await assertPollinationsVideoAffordable({
    durationSec,
    width: capped.width,
    height: capped.height,
    model: params.model,
    sceneNumber: params.sceneNumber,
    forceRefresh: true,
  })

  let model = preflight.model

  const url = new URL(`${GEN_POLLINATIONS_BASE}/video/${encodeURIComponent(params.prompt.slice(0, 4000))}`)
  url.searchParams.set('model', model)
  url.searchParams.set('image', publicImageUrl)
  if (params.durationSec != null) {
    url.searchParams.set('duration', String(durationSec))
  }
  if (params.aspectRatio) url.searchParams.set('aspectRatio', params.aspectRatio)
  url.searchParams.set('width', String(capped.width))
  url.searchParams.set('height', String(capped.height))

  const started = Date.now()
  logPollinations('video request', {
    provider: 'pollinations',
    capability: 'video',
    model,
    productionId: params.productionId ?? null,
    scene: params.sceneNumber ?? null,
    imageDomain: (() => {
      try {
        return new URL(publicImageUrl).hostname
      } catch {
        return 'unknown'
      }
    })(),
    width: capped.width,
    height: capped.height,
    durationSec,
    estimatedCost: preflight.estimatedCost,
    balance: preflight.balance,
    affordable: true,
  })

  let lastError: PollinationsError | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    url.searchParams.set('model', model)
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'video/mp4,video/*', ...pollinationsAuthHeaders() },
        signal: AbortSignal.timeout(300_000),
      })

      if (!res.ok) {
        const bodyText = await res.text()
        const mapped = mapHttpError({
          res,
          capability: 'video',
          model,
          sceneNumber: params.sceneNumber,
          bodyText,
        })
        if (mapped.code === 'POLLINATIONS_CREDITS_EXHAUSTED' && attempt === 1) {
          clearPollinationsSpendableBalanceCache()
          const refreshed = await assertPollinationsVideoAffordable({
            durationSec,
            width: capped.width,
            height: capped.height,
            model,
            sceneNumber: params.sceneNumber,
            forceRefresh: true,
          }).catch(() => null)
          if (
            refreshed &&
            (refreshed.balance == null || refreshed.estimatedCost <= refreshed.balance)
          ) {
            model = refreshed.model
            lastError = mapped
            await sleep(1500)
            continue
          }
          throw mapped
        }
        if (isRetryablePollinationsError(mapped) && attempt < MAX_ATTEMPTS) {
          if (res.status === 429) {
            invalidatePollinationsModelCache()
            const next = await assertPollinationsVideoAffordable({
              durationSec,
              width: capped.width,
              height: capped.height,
              sceneNumber: params.sceneNumber,
              forceRefresh: true,
            }).catch(() => null)
            if (next?.model) model = next.model
          }
          lastError = mapped
          await sleep(2000 * attempt)
          continue
        }
        throw mapped
      }

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('video')) {
        throw new PollinationsError({
          code: 'POLLINATIONS_VIDEO_INVALID',
          message: 'Pollinations returned non-video response',
          stage: 'validation',
          model,
          sceneNumber: params.sceneNumber,
        })
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 4096) {
        throw new PollinationsError({
          code: 'POLLINATIONS_VIDEO_INVALID',
          message: 'Pollinations returned empty video',
          stage: 'validation',
          model,
          sceneNumber: params.sceneNumber,
        })
      }

      logPollinations('video request complete', {
        provider: 'pollinations',
        capability: 'video',
        model,
        productionId: params.productionId ?? null,
        scene: params.sceneNumber ?? null,
        durationMs: Date.now() - started,
        bytes: buffer.length,
        attempt,
      })

      return { buffer, model }
    } catch (err) {
      if (err instanceof PollinationsError) {
        throw err
      }
      if (attempt < MAX_ATTEMPTS) {
        lastError = new PollinationsError({
          code: 'POLLINATIONS_VIDEO_GENERATION_FAILED',
          message: err instanceof Error ? err.message : 'Pollinations video network error',
          model,
          sceneNumber: params.sceneNumber,
        })
        await sleep(2000 * attempt)
        continue
      }
      throw err
    }
  }

  throw (
    lastError ??
    new PollinationsError({ code: 'POLLINATIONS_VIDEO_GENERATION_FAILED', message: 'Pollinations video failed' })
  )
}
