import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { downloadToFile } from '@/lib/video/download-asset'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path.server'
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
  V7VideoProviderHealth,
} from '@/lib/v7/providers/video-provider.types'

const WIDTH = 1080
const HEIGHT = 1920
const FPS = 30

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegPath()
    if (!bin) {
      reject(new Error('FFmpeg binary not found'))
      return
    }
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString().slice(-2000)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.slice(-800) || `ffmpeg exited ${code}`))
    })
  })
}

/** Last resort — encode a real MP4 from the approved storyboard still with cinematic motion. */
export const imageAnimationVideoProvider: V7VideoProvider = {
  id: 'image-animation',
  displayName: 'Image Animation',
  modelId: 'ffmpeg-ken-burns',

  supports(input) {
    return Boolean(input.imageUrl?.trim() && resolveFfmpegPath())
  },

  validateInput(input) {
    if (!input.imageUrl?.trim()) return { ok: false, reason: 'imageUrl is required' }
    if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
    if (!resolveFfmpegPath()) return { ok: false, reason: 'FFmpeg not available' }
    return { ok: true }
  },

  async health(): Promise<V7VideoProviderHealth> {
    return resolveFfmpegPath()
      ? { healthy: true }
      : { healthy: false, message: 'FFmpeg not configured' }
  },

  estimateCost: () => 0,
  estimateTime: () => 45_000,

  async generate(input: V7VideoGenerationInput): Promise<V7VideoGenerationResult> {
    const validation = this.validateInput(input)
    if (!validation.ok) {
      throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'image-animation', {
        message: validation.reason,
      })
    }

    const started = Date.now()
    const durationSec = clampV7SceneVideoDuration(input.durationSec)
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-v7-imganim-'))
    const imagePath = path.join(workDir, 'frame.jpg')
    const outputPath = path.join(workDir, 'scene.mp4')

    try {
      await downloadToFile(input.imageUrl, imagePath)
      const frames = Math.round(durationSec * FPS)
      const vf = [
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
        `crop=${WIDTH}:${HEIGHT}`,
        `zoompan=z='min(zoom+0.0012,1.28)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
      ].join(',')

      await runFfmpeg([
        '-y',
        '-loop',
        '1',
        '-i',
        imagePath,
        '-vf',
        vf,
        '-t',
        String(durationSec),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'medium',
        '-crf',
        '18',
        outputPath,
      ])

      const localValidation = await validateLocalVideoFile(outputPath, durationSec)
      if (!localValidation.valid) {
        throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'image-animation', {
          message: localValidation.error ?? 'Image animation encode failed validation',
        })
      }

      const buffer = await fs.readFile(outputPath)
      const dataUrl = `data:video/mp4;base64,${buffer.toString('base64')}`
      const persisted = await persistV7SceneVideo({
        sourceUrl: dataUrl,
        userId: input.userId,
        storagePath: input.storagePath,
        providerId: 'image-animation',
        expectedDurationSec: durationSec,
      })

      return {
        success: true,
        provider: 'image-animation',
        model: 'ffmpeg-ken-burns',
        videoUrl: persisted.videoUrl,
        thumbnailUrl: input.imageUrl,
        durationSec: persisted.durationSec,
        width: input.width,
        height: input.height,
        generationTimeMs: Date.now() - started,
        retries: 0,
        storagePath: input.storagePath,
        metadata: {
          provider: 'image-animation',
          model: 'ffmpeg-ken-burns',
          fallback: true,
          promptArchive: input.promptArchive ?? {},
          continuityId: input.continuityId,
          cameraMovement: input.cameraMovement,
        },
      }
    } catch (err) {
      if (err instanceof V7VideoProviderRequestError) throw err
      throw classifyV7VideoUnknownError('image-animation', err)
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
    }
  },

  normalizeOutput(result) {
    return result
  },

  retry(input, previous) {
    return this.generate(input).then((result) => ({ ...result, retries: previous.retries + 1 }))
  },

  cancel() {},
  cleanup() {},
}
