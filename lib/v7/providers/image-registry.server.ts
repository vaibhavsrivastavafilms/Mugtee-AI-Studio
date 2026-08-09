import 'server-only'

import { sleep } from '@/lib/ai/providers/shared'
import { pollinationsImageProvider } from '@/lib/v7/providers/providers/pollinations-image.server'
import {
  classifyV7ImageUnknownError,
  isV7ImageRetryableError,
  V7ImageProviderNotReadyError,
  V7ImageProviderRequestError,
} from '@/lib/v7/providers/image-errors.server'
import type {
  V7ImageGenerationInput,
  V7ImageGenerationResult,
  V7ImageProvider,
} from '@/lib/v7/providers/image-provider.types'
import {
  logV7ImageAllFailed,
  logV7ImageProviderFailure,
  logV7ImageProviderSuccess,
} from '@/lib/v7/providers/image-log.server'

const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [1_000, 2_000]

/** Production image provider — Pollinations only. */
export function resolveV7ImageProviders(): V7ImageProvider[] {
  return [pollinationsImageProvider]
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
  const provider = resolveV7ImageProviders()[0]
  if (!provider) {
    throw new V7ImageProviderNotReadyError({ reason: 'No image provider registered' })
  }

  const validation = provider.validateInput(input)
  if (!validation.ok) {
    throw new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', provider.id, {
      message: validation.reason,
    })
  }

  const health = await provider.health()
  if (!health.healthy) {
    throw new V7ImageProviderNotReadyError({
      reason: health.message ?? 'Pollinations image provider not ready',
      action: 'Retry later or set POLLINATIONS_API_KEY if required.',
    })
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

    logV7ImageAllFailed({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      failures: [{ provider: provider.id, code: classified.code, message: classified.message }],
    })
    logV7ImageProviderFailure({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      providerId: provider.id,
      displayName: provider.displayName,
      model: provider.modelId,
      err: classified,
    })
    throw classified
  }
}

export function validateV7ImageProvidersOnStartup(): void {
  console.info('[v7-image] Production image provider: pollinations (free-first media)')
}
