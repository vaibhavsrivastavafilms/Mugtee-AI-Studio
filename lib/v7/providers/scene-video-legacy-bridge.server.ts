import 'server-only'

import { isValidRunwayApiKeyFormat, hasRunwayApiKey, generateRunwayVideo } from '@/lib/ai/runway-video'
import { resolveProviderApiKey, resolveSupabaseForProviderCredentials } from '@/lib/v7/connections/provider-credentials.server'
import type { ManagedVideoProviderId } from '@/lib/v7/connections/provider-connection.types'
import {
  createSeedanceTask,
  hasSeedanceApiKey,
  waitForSeedanceOutput,
} from '@/lib/video-providers/seedance-client'
import {
  classifyV7VideoUnknownError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import {
  persistV7SceneVideo,
} from '@/lib/v7/providers/video-provider-base.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
  V7VideoProviderHealth,
  V7VideoProviderId,
} from '@/lib/v7/providers/video-provider.types'
import { availableVideoModelsFromSingleId } from '@/lib/v7/providers/video-model-discovery.server'

export function hasV7LegacySceneVideoIntegration(): boolean {
  return hasSeedanceApiKey() || hasRunwayApiKey()
}

function validateNativeVideoInput(
  input: V7VideoGenerationInput
): { ok: true } | { ok: false; reason: string } {
  if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
  if (!input.imageUrl?.trim()) return { ok: false, reason: 'imageUrl is required' }
  if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
  if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
  if (!input.continuityId?.trim()) return { ok: false, reason: 'continuityId is required' }
  if (!input.cameraMovement?.trim()) return { ok: false, reason: 'cameraMovement is required' }
  if (!Number.isFinite(input.durationSec) || input.durationSec <= 0) {
    return { ok: false, reason: 'durationSec is required' }
  }
  return { ok: true }
}

async function resolveLegacyProviderApiKey(
  managedId: ManagedVideoProviderId,
  userId?: string
): Promise<string | undefined> {
  const supabase = await resolveSupabaseForProviderCredentials()
  return resolveProviderApiKey(managedId, userId, supabase)
}

async function generateViaSeedance(
  providerId: V7VideoProviderId,
  modelId: string,
  input: V7VideoGenerationInput
): Promise<V7VideoGenerationResult> {
  const apiKey = await resolveLegacyProviderApiKey('seedance', input.userId)
  if (!apiKey) {
    throw new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', providerId, {
      message: 'Seedance is not connected. Add an API key in Provider Manager or set SEEDANCE_API_KEY.',
    })
  }

  const started = Date.now()
  const request = {
    prompt: input.prompt.slice(0, 160),
    imageUrl: input.imageUrl,
    durationSec: input.durationSec,
    aspectRatio: input.aspectRatio,
    sceneNumber: input.sceneNumber,
    productionId: input.productionId,
  }

  console.info('[v7-video] seedance request', request)

  let taskId: string
  try {
    taskId = await createSeedanceTask({
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      durationSec: input.durationSec,
      aspectRatio: input.aspectRatio,
      apiKey,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v7-video] seedance create failed', {
      ...request,
      providerResponse: message,
    })
    throw new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', providerId, {
      message,
      cause: err,
    })
  }

  let output: { videoUrl: string; thumbnailUrl: string | null }
  try {
    output = await waitForSeedanceOutput(taskId, { apiKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v7-video] seedance poll failed', {
      ...request,
      taskId,
      providerResponse: message,
    })
    throw new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', providerId, {
      message,
      cause: err,
    })
  }

  console.info('[v7-video] seedance response', {
    ...request,
    taskId,
    downloadUrl: output.videoUrl,
    generationTimeMs: Date.now() - started,
  })

  const persisted = await persistV7SceneVideo({
    sourceUrl: output.videoUrl,
    userId: input.userId,
    storagePath: input.storagePath,
    providerId,
    expectedDurationSec: input.durationSec,
  })

  return {
    success: true,
    provider: providerId,
    model: modelId,
    videoUrl: persisted.videoUrl,
    thumbnailUrl: output.thumbnailUrl ?? input.imageUrl,
    durationSec: persisted.durationSec,
    width: input.width,
    height: input.height,
    generationTimeMs: Date.now() - started,
    retries: 0,
    storagePath: input.storagePath,
    metadata: {
      provider: providerId,
      model: modelId,
      backend: 'seedance',
      taskId,
      downloadUrl: output.videoUrl,
      uploadUrl: persisted.videoUrl,
      codec: persisted.codec,
      promptArchive: input.promptArchive ?? {},
      continuityId: input.continuityId,
      consistencyModes: input.consistencyModes ?? [],
    },
  }
}

async function generateViaRunway(
  providerId: V7VideoProviderId,
  modelId: string,
  input: V7VideoGenerationInput
): Promise<V7VideoGenerationResult> {
  const apiKey = await resolveLegacyProviderApiKey('runway', input.userId)
  if (!apiKey || !isValidRunwayApiKeyFormat(apiKey)) {
    throw new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', providerId, {
      message:
        'Runway is not connected. Add a valid API key in Provider Manager or set RUNWAYML_API_SECRET.',
    })
  }

  const started = Date.now()
  const request = {
    prompt: input.prompt.slice(0, 160),
    imageUrl: input.imageUrl,
    durationSec: input.durationSec,
    sceneNumber: input.sceneNumber,
    productionId: input.productionId,
  }

  console.info('[v7-video] runway request', request)

  let videoUrl: string
  try {
    ;({ videoUrl } = await generateRunwayVideo({
      promptText: input.prompt.slice(0, 1000),
      promptImage: input.imageUrl,
      durationSec: input.durationSec,
      apiKey,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v7-video] runway failed', {
      ...request,
      providerResponse: message,
    })
    throw new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', providerId, {
      message,
      cause: err,
    })
  }

  console.info('[v7-video] runway response', {
    ...request,
    downloadUrl: videoUrl,
    generationTimeMs: Date.now() - started,
  })

  const persisted = await persistV7SceneVideo({
    sourceUrl: videoUrl,
    userId: input.userId,
    storagePath: input.storagePath,
    providerId,
    expectedDurationSec: input.durationSec,
  })

  return {
    success: true,
    provider: providerId,
    model: modelId,
    videoUrl: persisted.videoUrl,
    thumbnailUrl: input.imageUrl,
    durationSec: persisted.durationSec,
    width: input.width,
    height: input.height,
    generationTimeMs: Date.now() - started,
    retries: 0,
    storagePath: input.storagePath,
    metadata: {
      provider: providerId,
      model: modelId,
      backend: 'runway',
      downloadUrl: videoUrl,
      uploadUrl: persisted.videoUrl,
      codec: persisted.codec,
      promptArchive: input.promptArchive ?? {},
      continuityId: input.continuityId,
      consistencyModes: input.consistencyModes ?? [],
    },
  }
}

function createNativeVideoProvider(config: {
  id: V7VideoProviderId
  managedId: ManagedVideoProviderId
  displayName: string
  modelId: string
  estimateMs: number
  configured: () => boolean
  missingEnvMessage: string
  generate: (input: V7VideoGenerationInput) => Promise<V7VideoGenerationResult>
}): V7VideoProvider {
  return {
    id: config.id,
    displayName: config.displayName,
    modelId: config.modelId,
    supports: (input) => {
      if (!input.imageUrl?.trim()) return false
      if (config.configured()) return true
      return Boolean(input.userId?.trim())
    },
    validateInput: validateNativeVideoInput,
    health: async (): Promise<V7VideoProviderHealth> => {
      if (config.configured()) return { healthy: true }
      // accountCapabilities already validated user-managed keys before health runs.
      return { healthy: true }
    },
    availableModels: async () => ({
      models: [config.modelId],
      preferred: config.modelId,
    }),
    availableVideoModels: async () => availableVideoModelsFromSingleId(config.modelId),
    accountCapabilities: async (context) => {
      const apiKey = await resolveLegacyProviderApiKey(config.managedId, context?.userId)
      if (config.managedId === 'runway') {
        if (!apiKey || !isValidRunwayApiKeyFormat(apiKey)) {
          return {
            authenticated: false,
            entitled: false,
            reason: 'NOT_AUTHENTICATED' as const,
            message: config.missingEnvMessage,
          }
        }
        return {
          authenticated: true,
          entitled: true,
          entitledModels: [config.modelId],
        }
      }

      if (!apiKey) {
        return {
          authenticated: false,
          entitled: false,
          reason: 'NOT_AUTHENTICATED' as const,
          message: config.missingEnvMessage,
        }
      }

      return {
        authenticated: true,
        entitled: true,
        entitledModels: [config.modelId],
      }
    },
    estimateCost: () => 0,
    estimateTime: () => config.estimateMs,
    generate: config.generate,
    normalizeOutput: (result) => result,
    retry: async (input, previous) => {
      try {
        const result = await config.generate(input)
        return { ...result, retries: previous.retries + 1 }
      } catch (err) {
        if (err instanceof V7VideoProviderRequestError) throw err
        throw classifyV7VideoUnknownError(config.id, err)
      }
    },
    cancel: () => undefined,
    cleanup: () => undefined,
  }
}

export const seedanceVideoProvider = createNativeVideoProvider({
  id: 'seedance',
  managedId: 'seedance',
  displayName: 'Seedance',
  modelId: 'seedance-2.0',
  estimateMs: 240_000,
  configured: hasSeedanceApiKey,
  missingEnvMessage: 'SEEDANCE_API_KEY missing',
  generate: (input) => generateViaSeedance('seedance', 'seedance-2.0', input),
})

export const runwayVideoProvider = createNativeVideoProvider({
  id: 'runway',
  managedId: 'runway',
  displayName: 'Runway Gen-4.5',
  modelId: 'gen4.5',
  estimateMs: 300_000,
  configured: hasRunwayApiKey,
  missingEnvMessage: 'RUNWAYML_API_SECRET or RUNWAY_API_KEY missing or invalid (expected key_ + 128 hex)',
  generate: (input) => generateViaRunway('runway', 'gen4.5', input),
})
