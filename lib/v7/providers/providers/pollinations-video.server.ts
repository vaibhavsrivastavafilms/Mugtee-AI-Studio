import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { fetchPollinationsVideoBuffer } from '@/lib/pollinations/client.server'
import { isPollinationsError, PollinationsError } from '@/lib/pollinations/errors.server'
import { probePollinationsHealth } from '@/lib/pollinations/models.server'
import {
  classifyV7VideoUnknownError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import {
  clampV7SceneVideoDuration,
  persistV7SceneVideo,
  validateLocalVideoFile,
} from '@/lib/v7/providers/video-provider-base.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
} from '@/lib/v7/providers/video-provider.types'

function validateInput(input: V7VideoGenerationInput): { ok: true } | { ok: false; reason: string } {
  if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
  if (!input.imageUrl?.trim()) return { ok: false, reason: 'imageUrl is required' }
  if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
  if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
  return { ok: true }
}

function mapPollinationsError(err: unknown): V7VideoProviderRequestError {
  if (err instanceof PollinationsError) {
    const invalidInputCodes = new Set<PollinationsError['code']>([
      'POLLINATIONS_INPUT_REJECTED',
      'POLLINATIONS_IMAGE_NOT_ACCESSIBLE',
      'POLLINATIONS_MODEL_I2V_UNSUPPORTED',
      'POLLINATIONS_IMAGE_URL_INVALID',
      'POLLINATIONS_VIDEO_INVALID',
    ])
    const code = invalidInputCodes.has(err.code)
      ? 'PROVIDER_INVALID_RESPONSE'
      : err.code === 'POLLINATIONS_AUTH_FAILED'
        ? 'PROVIDER_AUTH_FAILED'
        : err.code === 'POLLINATIONS_RATE_LIMITED'
          ? 'PROVIDER_RATE_LIMITED'
          : err.code === 'POLLINATIONS_TIMEOUT'
            ? 'PROVIDER_TIMEOUT'
            : err.code === 'POLLINATIONS_SERVER_ERROR' || err.code === 'POLLINATIONS_MODEL_UNAVAILABLE'
              ? 'PROVIDER_UNAVAILABLE'
              : err.code === 'POLLINATIONS_CREDITS_EXHAUSTED' || err.code === 'POLLINATIONS_CREDITS_REQUIRED'
                ? 'PROVIDER_QUOTA_EXCEEDED'
                : 'PROVIDER_UNAVAILABLE'
    return new V7VideoProviderRequestError(code, 'pollinations', {
      message: `${err.code}: ${err.message}`,
      httpStatus: err.httpStatus,
      cause: err,
    })
  }
  return classifyV7VideoUnknownError('pollinations', err)
}

async function generate(input: V7VideoGenerationInput): Promise<V7VideoGenerationResult> {
  const validation = validateInput(input)
  if (!validation.ok) {
    throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'pollinations', {
      message: validation.reason,
    })
  }

  const started = Date.now()
  const durationSec = clampV7SceneVideoDuration(input.durationSec)

  try {
    const remote = await fetchPollinationsVideoBuffer({
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      durationSec,
      aspectRatio: input.aspectRatio,
      width: input.width,
      height: input.height,
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      userId: input.userId,
    })

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-pollinations-video-'))
    const localPath = path.join(workDir, 'scene.mp4')
    try {
      await fs.writeFile(localPath, remote.buffer)
      const validationResult = await validateLocalVideoFile(localPath, durationSec)
      if (!validationResult.valid) {
        throw new PollinationsError({
          code: 'POLLINATIONS_VIDEO_INVALID',
          message: validationResult.error ?? 'Video failed FFprobe validation',
          stage: 'validation',
          sceneNumber: input.sceneNumber,
          model: remote.model,
        })
      }

      const dataUrl = `data:video/mp4;base64,${remote.buffer.toString('base64')}`
      const persisted = await persistV7SceneVideo({
        sourceUrl: dataUrl,
        userId: input.userId,
        storagePath: input.storagePath,
        providerId: 'pollinations',
        expectedDurationSec: durationSec,
      })

      console.info('[pollinations] checkpoint-ready', {
        provider: 'pollinations',
        capability: 'video',
        model: remote.model,
        productionId: input.productionId,
        sceneNumber: input.sceneNumber,
        uploadUrl: persisted.videoUrl,
        ffprobeDurationSec: persisted.durationSec,
        generationTimeMs: Date.now() - started,
        checkpointSaved: true,
      })

      return {
        success: true,
        provider: 'pollinations',
        model: remote.model,
        videoUrl: persisted.videoUrl,
        thumbnailUrl: input.imageUrl,
        durationSec: persisted.durationSec,
        width: input.width,
        height: input.height,
        generationTimeMs: Date.now() - started,
        retries: 0,
        storagePath: input.storagePath,
        metadata: {
          provider: 'pollinations',
          model: remote.model,
          uploadUrl: persisted.videoUrl,
          codec: persisted.codec,
          promptArchive: input.promptArchive ?? {},
          continuityId: input.continuityId,
          consistencyModes: input.consistencyModes ?? [],
        },
      }
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
    }
  } catch (err) {
    if (err instanceof V7VideoProviderRequestError) throw err
    if (isPollinationsError(err)) throw mapPollinationsError(err)
    throw mapPollinationsError(err)
  }
}

export const pollinationsVideoProvider: V7VideoProvider = {
  id: 'pollinations',
  displayName: 'Pollinations',
  modelId: 'discovered',
  supports(input) {
    return Boolean(input.prompt?.trim() && input.imageUrl?.trim() && input.userId?.trim())
  },
  validateInput,
  health: async () => {
    const probe = await probePollinationsHealth()
    return {
      healthy: probe.videoReady,
      message: probe.reason ?? undefined,
    }
  },
  availableVideoModels: async () => {
    const probe = await probePollinationsHealth()
    const models = probe.videoModel
      ? [{ id: probe.videoModel, available: true, free: true, priority: 1 }]
      : []
    return {
      models,
      preferred: models[0],
    }
  },
  availableModels: async () => {
    const probe = await probePollinationsHealth()
    return {
      models: probe.videoModel ? [probe.videoModel] : [],
      preferred: probe.videoModel ?? undefined,
    }
  },
  accountCapabilities: async () => {
    const probe = await probePollinationsHealth()
    if (!probe.authenticated) {
      return {
        authenticated: false,
        entitled: false,
        reason: 'NOT_AUTHENTICATED' as const,
        message: probe.reason ?? 'Pollinations video requires POLLINATIONS_API_KEY',
      }
    }
    if (!probe.entitled || !probe.videoReady) {
      return {
        authenticated: true,
        entitled: false,
        reason:
          probe.code === 'POLLINATIONS_CREDITS_REQUIRED' ||
          probe.code === 'POLLINATIONS_CREDITS_EXHAUSTED'
            ? ('NOT_ENTITLED' as const)
            : ('NOT_CONFIGURED' as const),
        message: probe.reason ?? 'Pollinations video is not entitled for the current balance',
        entitledModels: [],
      }
    }
    return {
      authenticated: true,
      entitled: true,
      entitledModels: probe.videoModel ? [probe.videoModel] : [],
    }
  },
  estimateCost: () => 0,
  estimateTime: () => 120_000,
  generate,
  normalizeOutput: (result) => result,
  retry: async (input, previous) => {
    const result = await generate(input)
    return { ...result, retries: previous.retries + 1 }
  },
  cancel: () => undefined,
  cleanup: () => undefined,
}
