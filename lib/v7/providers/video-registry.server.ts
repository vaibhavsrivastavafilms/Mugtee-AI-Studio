import 'server-only'

import { sleep } from '@/lib/ai/providers/shared'
import { isV7SceneVideoProviderConfigured } from '@/lib/v7/provider-availability.server'
import { V7UploadFailedError } from '@/lib/v7/input-validation.server'
import { pollinationsVideoProvider } from '@/lib/v7/providers/providers/pollinations-video.server'
import { ProviderManager } from '@/lib/v7/providers/provider-manager.server'
import {
  evaluateV7VideoProviderCapability,
  resolveSceneVideoProviderCapabilities,
} from '@/lib/v7/providers/video-capability.server'
import {
  buildVideoProviderSelectionReport,
  classifyExecutionFailure,
  throwVideoChainTerminalError,
} from '@/lib/v7/providers/video-chain-result.server'
import {
  classifyV7VideoUnknownError,
  isV7VideoRetryableError,
  V7VideoProviderNotReadyError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
  V7VideoProviderCapabilityReport,
} from '@/lib/v7/providers/video-provider.types'
import {
  logV7VideoAllFailed,
  logV7VideoProviderFailure,
  logV7VideoProviderSelected,
  logV7VideoProviderSuccess,
} from '@/lib/v7/providers/video-log.server'

const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [2_000, 4_000]

/** Production video provider — Pollinations only. */
export function resolveV7VideoProviders(): V7VideoProvider[] {
  return [pollinationsVideoProvider]
}

export async function inspectSceneVideoProviderCapabilities(
  input: V7VideoGenerationInput
): Promise<V7VideoProviderCapabilityReport[]> {
  return resolveSceneVideoProviderCapabilities(resolveV7VideoProviders(), input)
}

export async function auditSceneVideoProviderCapabilities(
  input: V7VideoGenerationInput
): Promise<ReturnType<typeof buildVideoProviderSelectionReport>> {
  const evaluations = await inspectSceneVideoProviderCapabilities(input)
  return buildVideoProviderSelectionReport({ evaluations, selectedProvider: null })
}

async function runProviderWithRetries(
  provider: V7VideoProvider,
  input: V7VideoGenerationInput
): Promise<V7VideoGenerationResult> {
  let lastError: unknown
  const chainStartedAt = Date.now()

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const attemptStartedAt = Date.now()
    console.info('[v7-video] provider generate attempt', {
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      provider: provider.id,
      attempt,
      model: provider.modelId,
    })

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

      console.info('[v7-video] provider generate success', {
        productionId: input.productionId,
        sceneNumber: input.sceneNumber,
        provider: provider.id,
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        chainDurationMs: Date.now() - chainStartedAt,
        storagePath: result.storagePath,
        videoUrl: result.videoUrl,
        model: result.model,
      })

      return { ...result, retries: attempt }
    } catch (err) {
      if (err instanceof V7UploadFailedError) {
        console.error('[v7-video] upload failed', {
          productionId: input.productionId,
          sceneNumber: input.sceneNumber,
          provider: provider.id,
          attempt,
          message: err.message,
          storagePath: err.storagePath,
          stack: err.stack,
        })
        throw err
      }
      lastError = err
      const classified =
        err instanceof V7VideoProviderRequestError
          ? err
          : classifyV7VideoUnknownError(provider.id, err)

      console.warn('[v7-video] provider generate failed', {
        productionId: input.productionId,
        sceneNumber: input.sceneNumber,
        provider: provider.id,
        attempt,
        code: classified.code,
        message: classified.message,
        durationMs: Date.now() - attemptStartedAt,
        stack: classified.stack,
      })

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
  const provider = resolveV7VideoProviders()[0]
  if (!provider) {
    throw new V7VideoProviderNotReadyError({
      reason: 'No video provider registered',
      action: 'Pollinations video provider is not ready.',
    })
  }

  const cachedEvaluation = ProviderManager.getPollinationsEvaluation(input.userId)
  const evaluation =
    cachedEvaluation ??
    (await evaluateV7VideoProviderCapability(provider, input, 1))

  const capabilityAudit = buildVideoProviderSelectionReport({
    evaluations: [evaluation],
    selectedProvider: evaluation.available ? provider.id : null,
  })

  console.info('[v7-video] capability audit', {
    productionId: input.productionId,
    sceneNumber: input.sceneNumber,
    provider: provider.id,
    available: evaluation.available,
    selectedModel:
      ProviderManager.getPollinationsSelectedModel(input.userId) ??
      evaluation.entitledModels?.[0] ??
      evaluation.models?.[0] ??
      null,
    ...capabilityAudit,
  })

  if (!evaluation.available) {
    logV7VideoAllFailed({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      failures: [
        {
          provider: provider.id,
          code: 'PROVIDER_UNAVAILABLE',
          message: evaluation.message ?? evaluation.reason ?? 'not_available',
        },
      ],
      ...capabilityAudit,
    })
    throw new V7VideoProviderNotReadyError({
      reason: evaluation.message ?? evaluation.reason ?? 'Pollinations video provider is not ready',
      action: 'Retry later or set POLLINATIONS_API_KEY if required.',
      selectedModel: evaluation.models?.[0] ?? null,
    })
  }

  const chainStartedAt = Date.now()

  console.info('[v7-video] provider execution start', {
    productionId: input.productionId,
    sceneNumber: input.sceneNumber,
    provider: provider.id,
    ...buildVideoProviderSelectionReport({ evaluations: [evaluation], selectedProvider: provider.id }),
  })

  try {
    const result = await runProviderWithRetries(provider, input)
    const selection = buildVideoProviderSelectionReport({
      evaluations: [evaluation],
      selectedProvider: result.provider,
    })

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

    logV7VideoProviderSelected({
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      providerPriority: 1,
      generationTimeMs: result.generationTimeMs,
      videoUrl: result.videoUrl,
      storagePath: result.storagePath,
      checkpointSaved: true,
      ...selection,
    })

    console.info('[v7-video] scene video ready', {
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      provider: result.provider,
      model: result.model,
      videoUrl: result.videoUrl,
      storagePath: result.storagePath,
      durationSec: result.durationSec,
      generationTimeMs: result.generationTimeMs,
      chainDurationMs: Date.now() - chainStartedAt,
      uploadResult: 'success',
      checkpointSaved: true,
      ...selection,
    })
    return result
  } catch (err) {
    if (err instanceof V7UploadFailedError) throw err

    const failure = classifyExecutionFailure(provider.id, err)
    logV7VideoProviderFailure({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      providerId: provider.id,
      displayName: provider.displayName,
      model: provider.modelId,
      err: failure,
    })

    throwVideoChainTerminalError({
      sceneNumber: input.sceneNumber,
      productionId: input.productionId,
      evaluations: [evaluation],
      executionFailures: [failure],
    })
  }
}

export function validateV7VideoProvidersOnStartup(): void {
  void (async () => {
    const chain = resolveV7VideoProviders()
    const probeInput = {
      imageUrl: 'https://example.com/storyboard.png',
      userId: 'startup-probe',
    } as V7VideoGenerationInput
    const evaluations = await Promise.all(
      chain.map((provider, index) => evaluateV7VideoProviderCapability(provider, probeInput, index + 1))
    )
    const eligible = evaluations.filter((entry) => entry.available)

    if (eligible.length === 0 && !isV7SceneVideoProviderConfigured()) {
      console.error(
        '[v7-video] Pollinations video provider not configured. Set POLLINATIONS_API_KEY if required. Productions will fail at animation until media is available.'
      )
      return
    }

    console.info('[v7-video] Scene video capability snapshot', {
      provider: 'pollinations',
      eligible: eligible.map((entry) => entry.provider),
      evaluations: evaluations.map((entry) => ({
        provider: entry.provider,
        available: entry.available,
        reason: entry.reason ?? null,
      })),
    })
  })().catch((err) => {
    console.error('[v7-video] startup capability probe failed', err)
  })
}
