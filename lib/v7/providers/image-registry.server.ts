import 'server-only'

import { sleep } from '@/lib/ai/providers/shared'
import { comfyUiImageProvider } from '@/lib/v7/providers/providers/comfyui-image.server'
import { fluxImageProvider } from '@/lib/v7/providers/providers/flux-image.server'
import { gptImageV7Provider } from '@/lib/v7/providers/providers/gpt-image-v7.server'
import { pollinationsImageProvider } from '@/lib/v7/providers/providers/pollinations-image.server'
import { sdxlImageProvider } from '@/lib/v7/providers/providers/sdxl-image.server'
import {
  classifyV7ImageUnknownError,
  isV7ImageRetryableError,
  V7AllImageProvidersFailedError,
  V7ImageProviderRequestError,
} from '@/lib/v7/providers/image-errors.server'
import type {
  V7ImageGenerationInput,
  V7ImageGenerationResult,
  V7ImageProvider,
  V7ImageProviderId,
} from '@/lib/v7/providers/image-provider.types'
import {
  logV7ImageAllFailed,
  logV7ImageProviderFailure,
  logV7ImageProviderHealthSkip,
  logV7ImageProviderSuccess,
} from '@/lib/v7/providers/image-log.server'

const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [1_000, 2_000]

/** Ordered V7 image provider chain — local OSS before paid cloud. */
export function resolveV7ImageProviders(): V7ImageProvider[] {
  return [
    fluxImageProvider,
    comfyUiImageProvider,
    sdxlImageProvider,
    pollinationsImageProvider,
    gptImageV7Provider,
  ]
}

async function runProviderWithRetries(
  provider: V7ImageProvider,
  input: V7ImageGenerationInput
): Promise<V7ImageGenerationResult> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result =
        attempt === 0
          ? await provider.generate(input)
          : await provider.retry(input, {
              success: false,
              provider: provider.id,
              model: provider.modelId ?? provider.id,
              imageUrl: '',
              thumbnailUrl: '',
              seed: input.seed,
              width: input.width,
              height: input.height,
              generationTimeMs: 0,
              retries: attempt - 1,
              storagePath: input.storagePath,
              metadata: {},
            })
      return { ...result, retries: attempt }
    } catch (err) {
      lastError = err
      const classified =
        err instanceof V7ImageProviderRequestError
          ? err
          : classifyV7ImageUnknownError(provider.id, err)

      if (!isV7ImageRetryableError(classified) || attempt >= MAX_RETRIES) {
        throw classified
      }

      await sleep(RETRY_DELAYS_MS[attempt] ?? 2_000)
    }
  }

  throw lastError
}

export async function runV7ImageProviderChain(
  input: V7ImageGenerationInput
): Promise<V7ImageGenerationResult> {
  const providers = resolveV7ImageProviders().filter((p) => p.supports(input))
  if (providers.length === 0) {
    logV7ImageAllFailed({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      failures: [],
    })
    throw new V7AllImageProvidersFailedError([])
  }

  const failures: Array<{
    provider: V7ImageProviderId
    code: V7ImageProviderRequestError['code']
    message?: string
  }> = []

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]
    const next = providers[i + 1]

    const validation = provider.validateInput(input)
    if (!validation.ok) {
      failures.push({
        provider: provider.id,
        code: 'PROVIDER_INVALID_RESPONSE',
        message: validation.reason,
      })
      continue
    }

    const health = await provider.health()
    if (!health.healthy) {
      failures.push({
        provider: provider.id,
        code: 'PROVIDER_UNHEALTHY',
        message: health.message,
      })
      if (next) {
        logV7ImageProviderHealthSkip({
          sceneNumber: input.sceneNumber,
          providerId: provider.id,
          message: health.message,
          nextProviderId: next.id,
        })
      }
      continue
    }

    try {
      const result = await runProviderWithRetries(provider, input)
      logV7ImageProviderSuccess({
        sceneNumber: input.sceneNumber,
        productionId: input.productionId,
        providerId: result.provider,
        model: result.model,
        durationMs: result.generationTimeMs,
        retries: result.retries,
        resolution: `${result.width}x${result.height}`,
        seed: result.seed,
        storagePath: result.storagePath,
      })
      return result
    } catch (err) {
      const classified =
        err instanceof V7ImageProviderRequestError
          ? err
          : classifyV7ImageUnknownError(provider.id, err)
      failures.push({
        provider: provider.id,
        code: classified.code,
        message: classified.message,
      })
      if (next) {
        logV7ImageProviderFailure({
          sceneNumber: input.sceneNumber,
          productionId: input.productionId,
          providerId: provider.id,
          displayName: provider.displayName,
          model: provider.modelId,
          err: classified,
          nextProviderId: next.id,
        })
      }
    }
  }

  logV7ImageAllFailed({
    sceneNumber: input.sceneNumber,
    productionId: input.productionId,
    failures: failures.map((f) => ({
      provider: f.provider,
      code: f.code,
      message: f.message,
    })),
  })
  throw new V7AllImageProvidersFailedError(failures)
}

export function validateV7ImageProvidersOnStartup(): void {
  const chain = resolveV7ImageProviders()
  const configured = chain.filter((p) => p.supports({} as V7ImageGenerationInput))

  if (configured.length === 0) {
    console.warn('[v7-image] No image providers configured.')
    return
  }

  console.info(
    `[v7-image] Image providers ready: ${configured.map((p) => p.id).join(' → ')}`
  )

  if (!configured.some((p) => p.id === 'flux')) {
    console.warn('[v7-image] FLUXAPI_KEY not set — FLUX slot skipped.')
  }
  if (!configured.some((p) => p.id === 'sdxl')) {
    console.warn('[v7-image] SDXL requires TOGETHER_API_KEY or STABILITY_API_KEY.')
  }
  if (!configured.some((p) => p.id === 'comfyui')) {
    console.warn('[v7-image] ComfyUI requires COMFYUI_BASE_URL (local or remote).')
  }
}
