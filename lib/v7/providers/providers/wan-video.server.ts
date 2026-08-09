import 'server-only'

import { resolveProviderApiKey, resolveSupabaseForProviderCredentials } from '@/lib/v7/connections/provider-credentials.server'
import {
  availableWanVideoModels,
  fetchWanAvailableVideoModels,
  generateWanSceneVideo,
  hasWanVideoApiKey,
  isWanModelKnownUnpurchased,
  resolveWanVideoModelOrder,
  wanVideoModel,
  WanVideoError,
} from '@/lib/video-providers/wan-video-client'
import {
  classifyV7VideoUnknownError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import { persistV7SceneVideo } from '@/lib/v7/providers/video-provider-base.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
} from '@/lib/v7/providers/video-provider.types'

function validateInput(input: V7VideoGenerationInput): { ok: true } | { ok: false; reason: string } {
  if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
  if (!input.imageUrl?.trim()) return { ok: false, reason: 'reference image is required' }
  if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
  if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
  if (!input.continuityId?.trim()) return { ok: false, reason: 'continuityId is required' }
  if (!input.cameraMovement?.trim()) return { ok: false, reason: 'cameraMovement is required' }
  if (!Number.isFinite(input.durationSec) || input.durationSec <= 0) {
    return { ok: false, reason: 'durationSec is required' }
  }
  if (!input.promptArchive || Object.keys(input.promptArchive).length === 0) {
    return { ok: false, reason: 'scene metadata is required' }
  }
  return { ok: true }
}

function mapWanError(err: unknown): V7VideoProviderRequestError {
  if (err instanceof WanVideoError) {
    if (err.code === 'WAN_MODEL_NOT_ENABLED' || err.code === 'MODEL_NOT_AVAILABLE') {
      return new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', 'wan', {
        message: `${err.code}: ${err.message}`,
        httpStatus: err.httpStatus,
        cause: err,
      })
    }

    const code =
      err.code === 'WAN_INVALID_RESPONSE'
        ? 'PROVIDER_INVALID_RESPONSE'
        : err.code === 'WAN_AUTH_FAILED'
          ? 'PROVIDER_AUTH_FAILED'
          : err.code === 'WAN_RATE_LIMITED'
            ? 'PROVIDER_RATE_LIMITED'
            : err.code === 'WAN_TIMEOUT'
              ? 'PROVIDER_TIMEOUT'
              : 'PROVIDER_UNAVAILABLE'
    return new V7VideoProviderRequestError(code, 'wan', {
      message: `${err.code}: ${err.message}`,
      httpStatus: err.httpStatus,
      cause: err,
    })
  }
  return classifyV7VideoUnknownError('wan', err)
}

async function generate(input: V7VideoGenerationInput): Promise<V7VideoGenerationResult> {
  const supabase = await resolveSupabaseForProviderCredentials()
  const apiKey = await resolveProviderApiKey('wan', input.userId, supabase)
  if (!apiKey) {
    throw new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', 'wan', {
      message: 'WAN is not connected. Add an API key in Provider Manager or set WAN_API_KEY.',
    })
  }

  const validation = validateInput(input)
  if (!validation.ok) {
    throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'wan', {
      message: validation.reason,
    })
  }

  const started = Date.now()
  try {
    const result = await generateWanSceneVideo({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      imageUrl: input.imageUrl,
      durationSec: input.durationSec,
      width: input.width,
      height: input.height,
      cameraMovement: input.cameraMovement,
      narration: input.narration,
      dialogue: input.dialogue,
      continuityId: input.continuityId,
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      apiKey,
    })

    const persisted = await persistV7SceneVideo({
      sourceUrl: result.videoUrl,
      userId: input.userId,
      storagePath: input.storagePath,
      providerId: 'wan',
      expectedDurationSec: input.durationSec,
    })

    console.info('[wan-video] checkpoint-ready', {
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      sceneId: input.sceneId,
      provider: 'wan-video',
      model: result.model,
      requestId: result.requestId,
      taskId: result.taskId,
      uploadUrl: persisted.videoUrl,
      durationSec: persisted.durationSec,
      generationTimeMs: Date.now() - started,
    })

    return {
      success: true,
      provider: 'wan',
      model: result.model,
      videoUrl: persisted.videoUrl,
      thumbnailUrl: input.imageUrl,
      durationSec: persisted.durationSec,
      width: input.width,
      height: input.height,
      generationTimeMs: Date.now() - started,
      retries: 0,
      storagePath: input.storagePath,
      metadata: {
        provider: 'wan-video',
        model: result.model,
        taskId: result.taskId,
        requestId: result.requestId,
        downloadUrl: result.videoUrl,
        uploadUrl: persisted.videoUrl,
        codec: persisted.codec,
        promptArchive: input.promptArchive ?? {},
        continuityId: input.continuityId,
        consistencyModes: input.consistencyModes ?? [],
        providerResponse: result.providerResponse,
        modelSelection: result.modelSelection,
      },
    }
  } catch (err) {
    if (err instanceof V7VideoProviderRequestError) throw err
    throw mapWanError(err)
  }
}

export const wanVideoProvider: V7VideoProvider = {
  id: 'wan',
  displayName: 'WAN Video',
  modelId: 'discovered',
  supports(input) {
    if (hasWanVideoApiKey()) return Boolean(input.imageUrl?.trim())
    return Boolean(input.userId?.trim() && input.imageUrl?.trim())
  },
  validateInput,
  health: async () => {
    if (!hasWanVideoApiKey()) {
      return { healthy: false, message: 'WAN_API_KEY missing' }
    }

    const preferredModel = wanVideoModel()
    try {
      const discovered = await fetchWanAvailableVideoModels()
      if (discovered.length > 0) {
        const eligible = discovered.filter((model) => !isWanModelKnownUnpurchased(model.id))
        return {
          healthy: eligible.length > 0,
          message:
            eligible.length > 0
              ? preferredModel && !eligible.some((model) => model.id === preferredModel)
                ? `Configured model ${preferredModel} unavailable; ${eligible.length} discovered I2V model(s) ready`
                : undefined
              : 'No entitled WAN image-to-video models discovered from DashScope',
        }
      }
      return { healthy: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'WAN capability check failed'
      return { healthy: false, message }
    }
  },
  availableVideoModels: availableWanVideoModels,
  availableModels: async () => {
    const discovered = await availableWanVideoModels()
    return {
      models: discovered.models.map((model) => model.id),
      preferred: discovered.preferred?.id,
    }
  },
  accountCapabilities: async (context) => {
    const supabase = await resolveSupabaseForProviderCredentials()
    const apiKey = await resolveProviderApiKey('wan', context?.userId, supabase)
    if (!apiKey) {
      return {
        authenticated: false,
        entitled: false,
        reason: 'NOT_AUTHENTICATED' as const,
        message: 'WAN is not connected. Add an API key in Provider Manager or set WAN_API_KEY.',
      }
    }

    const preferred = wanVideoModel()
    const order = await resolveWanVideoModelOrder({ preferredModel: preferred })
    const entitledIds = order.models
      .filter((model) => !isWanModelKnownUnpurchased(model.id))
      .map((model) => model.id)

    if (order.discoveredModels.length > 0 && entitledIds.length === 0) {
      return {
        authenticated: true,
        entitled: false,
        reason: 'MODEL_NOT_ENABLED' as const,
        message: 'The connected DashScope account is not eligible for discovered WAN models.',
        entitledModels: [],
      }
    }

    return {
      authenticated: true,
      entitled: true,
      entitledModels: entitledIds.length > 0 ? entitledIds : order.eligibleModels,
    }
  },
  estimateCost: () => 0,
  estimateTime: () => 240_000,
  generate,
  normalizeOutput: (result) => result,
  retry: async (input, previous) => {
    const result = await generate(input)
    return { ...result, retries: previous.retries + 1 }
  },
  cancel: () => undefined,
  cleanup: () => undefined,
}
