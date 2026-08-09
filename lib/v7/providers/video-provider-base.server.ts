import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { downloadToFile } from '@/lib/video/download-asset'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path.server'
import { STORYBOARD_STORAGE_BUCKET } from '@/lib/storyboard/storyboard-asset'
import { V7UploadFailedError } from '@/lib/v7/input-validation.server'
import {
  classifyV7VideoUnknownError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
  V7VideoProviderHealth,
  V7VideoProviderId,
} from '@/lib/v7/providers/video-provider.types'
import { availableVideoModelsFromSingleId } from '@/lib/v7/providers/video-model-discovery.server'

const MIN_VIDEO_BYTES = 4_096

export function clampV7SceneVideoDuration(durationSec?: number): number {
  const value = durationSec ?? 7
  return Math.max(5, Math.min(10, Math.round(value)))
}

function parseDurationFromFfmpegStderr(stderr: string): number {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return 0
  return (
    Number.parseInt(match[1], 10) * 3600 +
    Number.parseInt(match[2], 10) * 60 +
    Number.parseFloat(match[3])
  )
}

function parseVideoCodecFromFfmpegStderr(stderr: string): string | undefined {
  const match = stderr.match(/Video:\s*([^,\n]+)/)
  return match?.[1]?.trim()
}

export async function validateLocalVideoFile(
  filePath: string,
  expectedDurationSec?: number
): Promise<{ valid: boolean; durationSec: number; codec?: string; error?: string }> {
  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile() || stat.size < MIN_VIDEO_BYTES) {
      return { valid: false, durationSec: 0, error: 'missing_or_too_small' }
    }
  } catch {
    return { valid: false, durationSec: 0, error: 'missing_or_too_small' }
  }

  const bin = resolveFfmpegPath()
  if (!bin) {
    return { valid: false, durationSec: 0, error: 'ffmpeg_unavailable' }
  }

  const probe = await new Promise<{ stderr: string; code: number | null }>((resolve, reject) => {
    const proc = spawn(bin, ['-hide_banner', '-i', filePath], { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => resolve({ stderr, code }))
  })

  const durationSec = parseDurationFromFfmpegStderr(probe.stderr)
  const codec = parseVideoCodecFromFfmpegStderr(probe.stderr)
  if (!codec || durationSec <= 0) {
    return { valid: false, durationSec, codec, error: 'invalid_headers_or_duration' }
  }

  if (expectedDurationSec != null && Math.abs(durationSec - expectedDurationSec) > 3) {
    return { valid: false, durationSec, codec, error: 'duration_mismatch' }
  }

  const decode = await new Promise<number | null>((resolve, reject) => {
    const proc = spawn(bin, ['-v', 'error', '-i', filePath, '-f', 'null', '-'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => resolve(code))
  })

  if (decode !== 0) {
    return { valid: false, durationSec, codec, error: 'decode_failed' }
  }

  return { valid: true, durationSec, codec }
}

export async function persistV7SceneVideo(params: {
  sourceUrl: string
  userId: string
  storagePath: string
  providerId: V7VideoProviderId
  expectedDurationSec?: number
}): Promise<{ videoUrl: string; durationSec: number; codec?: string }> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-v7-video-'))
  const localPath = path.join(workDir, 'scene.mp4')

  try {
    await downloadToFile(params.sourceUrl, localPath)
    const validation = await validateLocalVideoFile(localPath, params.expectedDurationSec)
    if (!validation.valid) {
      throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', params.providerId, {
        message: validation.error ?? 'Generated video failed validation',
      })
    }

    const buffer = await fs.readFile(localPath)
    const client = createSupabaseServiceClient()
    if (!client) {
      throw new V7UploadFailedError({
        stage: 'animation',
        storagePath: params.storagePath,
        message: 'Supabase service client unavailable for video upload',
      })
    }

    const { error } = await client.storage
      .from(STORYBOARD_STORAGE_BUCKET)
      .upload(params.storagePath, buffer, { contentType: 'video/mp4', upsert: true })

    if (error) {
      throw new V7UploadFailedError({
        stage: 'animation',
        storagePath: params.storagePath,
        message: `Video upload failed: ${error.message}`,
        cause: error,
      })
    }

    const { data: pub } = client.storage.from(STORYBOARD_STORAGE_BUCKET).getPublicUrl(params.storagePath)
    if (!pub.publicUrl?.trim()) {
      throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', params.providerId, {
        message: 'Video upload finished without public URL',
      })
    }

    return {
      videoUrl: pub.publicUrl,
      durationSec: validation.durationSec,
      codec: validation.codec,
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

export function createHttpVideoProvider(config: {
  id: V7VideoProviderId
  displayName: string
  modelId: string
  endpointEnv: string
  apiKeyEnv?: string
  healthPath?: string
  estimateMs?: number
}): V7VideoProvider {
  let activeController: AbortController | null = null

  function endpoint(): string | undefined {
    return process.env[config.endpointEnv]?.trim() || undefined
  }

  function validateInput(input: V7VideoGenerationInput): { ok: true } | { ok: false; reason: string } {
    if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
    if (!input.imageUrl?.trim()) return { ok: false, reason: 'imageUrl is required' }
    if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
    if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
    return { ok: true }
  }

  async function health(): Promise<V7VideoProviderHealth> {
    const base = endpoint()
    if (!base) return { healthy: false, message: 'Not configured' }
    const started = Date.now()
    try {
      const healthUrl = config.healthPath
        ? `${base.replace(/\/$/, '')}${config.healthPath}`
        : base.replace(/\/generate\/?$/, '/health')
      const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(4_000) })
      return {
        healthy: res.ok,
        latencyMs: Date.now() - started,
        message: res.ok ? undefined : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : 'Unavailable',
      }
    }
  }

  async function generateRemoteUrl(input: V7VideoGenerationInput): Promise<string> {
    const base = endpoint()
    if (!base) {
      throw new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', config.id, {
        message: `${config.displayName} endpoint not configured`,
      })
    }

    activeController?.abort()
    activeController = new AbortController()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv]?.trim() : undefined
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const res = await fetch(base, {
      method: 'POST',
      headers,
      signal: activeController.signal,
      body: JSON.stringify({
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        imageUrl: input.imageUrl,
        duration: input.durationSec,
        durationSec: input.durationSec,
        width: input.width,
        height: input.height,
        seed: input.seed,
        continuityId: input.continuityId,
        consistencyModes: input.consistencyModes ?? [],
        cameraMovement: input.cameraMovement,
        narration: input.narration,
        dialogue: input.dialogue,
        model: config.modelId,
      }),
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', config.id, {
        httpStatus: res.status,
        message: body.slice(0, 300) || `HTTP ${res.status}`,
      })
    }

    if (contentType.includes('application/json')) {
      const json = (await res.json()) as { url?: string; videoUrl?: string; output?: string }
      const url = json.videoUrl?.trim() || json.url?.trim() || json.output?.trim()
      if (!url) {
        throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
          message: 'Video endpoint returned JSON without URL',
        })
      }
      return url
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < MIN_VIDEO_BYTES) {
      throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
        message: 'Video endpoint returned empty binary',
      })
    }

    const mime = contentType.split(';')[0]?.trim() || 'video/mp4'
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  async function generate(input: V7VideoGenerationInput): Promise<V7VideoGenerationResult> {
    const validation = validateInput(input)
    if (!validation.ok) {
      throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
        message: validation.reason,
      })
    }

    const started = Date.now()
    try {
      const remoteUrl = await generateRemoteUrl(input)
      const persisted = await persistV7SceneVideo({
        sourceUrl: remoteUrl,
        userId: input.userId,
        storagePath: input.storagePath,
        providerId: config.id,
        expectedDurationSec: input.durationSec,
      })

      return {
        success: true,
        provider: config.id,
        model: config.modelId,
        videoUrl: persisted.videoUrl,
        thumbnailUrl: input.imageUrl,
        durationSec: persisted.durationSec,
        width: input.width,
        height: input.height,
        generationTimeMs: Date.now() - started,
        retries: 0,
        storagePath: input.storagePath,
        metadata: {
          provider: config.id,
          model: config.modelId,
          codec: persisted.codec,
          promptArchive: input.promptArchive ?? {},
          continuityId: input.continuityId,
          consistencyModes: input.consistencyModes ?? [],
        },
      }
    } catch (err) {
      if (err instanceof V7VideoProviderRequestError) throw err
      throw classifyV7VideoUnknownError(config.id, err)
    } finally {
      activeController = null
    }
  }

  return {
    id: config.id,
    displayName: config.displayName,
    modelId: config.modelId,
    supports: () => Boolean(endpoint()),
    validateInput,
    health,
    availableModels: async () => ({
      models: [config.modelId],
      preferred: config.modelId,
    }),
    availableVideoModels: async () => availableVideoModelsFromSingleId(config.modelId),
    accountCapabilities: async () => {
      const base = endpoint()
      if (!base) {
        return {
          authenticated: false,
          entitled: false,
          reason: 'NOT_CONFIGURED' as const,
          message: `${config.displayName} endpoint not configured`,
        }
      }
      if (config.apiKeyEnv && !process.env[config.apiKeyEnv]?.trim()) {
        return {
          authenticated: false,
          entitled: false,
          reason: 'NOT_AUTHENTICATED' as const,
          message: `${config.apiKeyEnv} missing`,
        }
      }
      return { authenticated: true, entitled: true, entitledModels: [config.modelId] }
    },
    estimateCost: () => 0,
    estimateTime: () => config.estimateMs ?? 180_000,
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
