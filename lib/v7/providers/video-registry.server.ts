import 'server-only'

import { sleep } from '@/lib/ai/providers/shared'
import { imageAnimationVideoProvider } from '@/lib/v7/providers/providers/image-animation-video.server'
import {
  animateDiffVideoProvider,
  cogVideoXProvider,
  hunyuanVideoProvider,
  ltxVideoProvider,
  mochiVideoProvider,
  wanVideoProvider,
} from '@/lib/v7/providers/providers/remote-video-providers.server'
import {
  classifyV7VideoUnknownError,
  isV7VideoRetryableError,
  V7AllVideoProvidersFailedError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
  V7VideoProviderId,
} from '@/lib/v7/providers/video-provider.types'
import {
  logV7VideoAllFailed,
  logV7VideoProviderFailure,
  logV7VideoProviderHealthSkip,
  logV7VideoProviderSuccess,
} from '@/lib/v7/providers/video-log.server'

const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [2_000, 4_000]

/** Ordered V7 scene video provider chain — true AI first, image animation last resort. */
export function resolveV7VideoProviders(): V7VideoProvider[] {
  return [
    wanVideoProvider,
    hunyuanVideoProvider,
    cogVideoXProvider,
    ltxVideoProvider,
    mochiVideoProvider,
    animateDiffVideoProvider,
    imageAnimationVideoProvider,
  ]
}

async function runProviderWithRetries(
  provider: V7VideoProvider,
  input: V7VideoGenerationInput
): Promise<V7VideoGenerationResult> {
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
              videoUrl: '',
              thumbnailUrl: input.imageUrl,
              durationSec: input.durationSec,
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
        err instanceof V7VideoProviderRequestError
          ? err
          : classifyV7VideoUnknownError(provider.id, err)

      if (!isV7VideoRetryableError(classified) || attempt >= MAX_RETRIES) {
        throw classified
      }

      await sleep(RETRY_DELAYS_MS[attempt] ?? 4_000)
    }
  }

  throw lastError
}

export async function runV7VideoProviderChain(
  input: V7VideoGenerationInput
): Promise<V7VideoGenerationResult> {
  const providers = resolveV7VideoProviders().filter((provider) => provider.supports(input))
  if (providers.length === 0) {
    logV7VideoAllFailed({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      failures: [],
    })
    throw new V7AllVideoProvidersFailedError([])
  }

  const failures: Array<{
    provider: V7VideoProviderId
    code: V7VideoProviderRequestError['code']
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
        logV7VideoProviderHealthSkip({
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
      logV7VideoProviderSuccess({
        sceneNumber: input.sceneNumber,
        productionId: input.productionId,
        providerId: result.provider,
        model: result.model,
        durationMs: result.generationTimeMs,
        retries: result.retries,
        durationSec: result.durationSec,
        storagePath: result.storagePath,
      })
      return result
    } catch (err) {
      const classified =
        err instanceof V7VideoProviderRequestError
          ? err
          : classifyV7VideoUnknownError(provider.id, err)
      failures.push({
        provider: provider.id,
        code: classified.code,
        message: classified.message,
      })
      if (next) {
        logV7VideoProviderFailure({
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

  logV7VideoAllFailed({
    sceneNumber: input.sceneNumber,
    productionId: input.productionId,
    failures,
  })
  throw new V7AllVideoProvidersFailedError(failures)
}

export function validateV7VideoProvidersOnStartup(): void {
  const chain = resolveV7VideoProviders()
  const configured = chain.filter((provider) =>
    provider.supports({} as V7VideoGenerationInput)
  )

  if (configured.length === 0) {
    console.warn('[v7-video] No AI video providers configured — image-animation requires FFmpeg.')
    return
  }

  console.info(
    `[v7-video] Scene video providers ready: ${configured.map((provider) => provider.id).join(' → ')}`
  )
}
