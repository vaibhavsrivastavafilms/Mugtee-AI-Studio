import 'server-only'

import { persistRemoteImage } from '@/lib/ai/generate-scene-image'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import {
  classifyV7ImageUnknownError,
  V7ImageProviderRequestError,
} from '@/lib/v7/providers/image-errors.server'
import type {
  V7ImageGenerationInput,
  V7ImageGenerationResult,
  V7ImageProvider,
  V7ImageProviderHealth,
  V7ImageProviderId,
} from '@/lib/v7/providers/image-provider.types'

export async function persistV7SceneImage(params: {
  remoteUrl: string
  userId: string
  storagePath: string
  providerId: V7ImageProviderId
}): Promise<string> {
  const url = await persistRemoteImage({
    remoteUrl: params.remoteUrl,
    userId: params.userId,
    filename: params.storagePath,
  })

  if (isEphemeralRemoteImageUrl(url)) {
    throw new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', params.providerId, {
      message: 'Image was not persisted to durable storage',
    })
  }

  return url
}

export function createRemoteUrlImageProvider(config: {
  id: V7ImageProviderId
  displayName: string
  modelId: string
  isConfigured: () => boolean
  generateRemoteUrl: (
    input: V7ImageGenerationInput
  ) => Promise<string | null>
  healthCheck?: () => Promise<V7ImageProviderHealth>
  estimateMs?: number
}): V7ImageProvider {
  let activeController: AbortController | null = null

  function validateInput(input: V7ImageGenerationInput): { ok: true } | { ok: false; reason: string } {
    if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
    if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
    if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
    return { ok: true }
  }

  async function health(): Promise<V7ImageProviderHealth> {
    if (!config.isConfigured()) {
      return { healthy: false, message: 'Not configured' }
    }
    if (config.healthCheck) return config.healthCheck()
    return { healthy: true }
  }

  async function generate(input: V7ImageGenerationInput): Promise<V7ImageGenerationResult> {
    if (!config.isConfigured()) {
      throw new V7ImageProviderRequestError('PROVIDER_AUTH_FAILED', config.id, {
        message: `${config.displayName} is not configured`,
      })
    }

    const validation = validateInput(input)
    if (!validation.ok) {
      throw new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
        message: validation.reason,
      })
    }

    activeController?.abort()
    activeController = new AbortController()
    const started = Date.now()

    try {
      const remoteUrl = await config.generateRemoteUrl(input)
      if (!remoteUrl?.trim()) {
        throw new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
          message: `${config.displayName} returned no image`,
        })
      }

      const imageUrl = await persistV7SceneImage({
        remoteUrl,
        userId: input.userId,
        storagePath: input.storagePath,
        providerId: config.id,
      })

      return {
        success: true,
        provider: config.id,
        model: config.modelId,
        imageUrl,
        thumbnailUrl: imageUrl,
        seed: input.seed,
        width: input.width,
        height: input.height,
        generationTimeMs: Date.now() - started,
        retries: 0,
        storagePath: input.storagePath,
        metadata: {
          provider: config.id,
          model: config.modelId,
          seed: input.seed,
          resolution: `${input.width}x${input.height}`,
          promptArchive: input.promptArchive ?? {},
          consistencyModes: input.consistencyModes ?? [],
        },
      }
    } catch (err) {
      if (err instanceof V7ImageProviderRequestError) throw err
      throw classifyV7ImageUnknownError(config.id, err)
    } finally {
      activeController = null
    }
  }

  return {
    id: config.id,
    displayName: config.displayName,
    modelId: config.modelId,
    supports: () => config.isConfigured(),
    validateInput,
    health,
    estimateCost: () => 0,
    estimateTime: () => config.estimateMs ?? 60_000,
    generate,
    normalizeOutput: (result) => result,
    retry: async (input, previous) => {
      const result = await generate(input)
      return { ...result, retries: previous.retries + 1 }
    },
    cancel: () => {
      activeController?.abort()
      activeController = null
    },
    cleanup: () => {
      activeController?.abort()
      activeController = null
    },
  }
}
