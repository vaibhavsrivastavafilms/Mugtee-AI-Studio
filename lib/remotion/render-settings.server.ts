import 'server-only'

import os from 'os'
import { REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from '@/lib/remotion/compositions/constants'

export type RemotionRenderMemoryEstimate = {
  width: number
  height: number
  fps: number
  durationSec: number
  durationInFrames: number
  concurrency: number
  sceneCount: number
  parallelEncodingDisabled: boolean
  /** Rough peak RSS contribution from frame buffers + encode pipeline (MB). */
  estimatedMemoryMb: number
  dataUrlAssetCount: number
  httpAssetCount: number
}

/** Cap parallel Chromium tabs — default low on local dev to avoid x264 malloc failures. */
export function resolveRemotionConcurrency(): number {
  const raw = process.env.REMOTION_CONCURRENCY?.trim()
  if (raw) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.min(parsed, 8)
    }
  }
  if (process.env.NODE_ENV === 'development') return 1
  return Math.min(2, Math.max(1, Math.floor(os.cpus().length / 2)))
}

export function resolveDisallowParallelEncoding(): boolean {
  if (process.env.REMOTION_PARALLEL_ENCODING === 'true') return false
  return true
}

export function resolveOffthreadVideoCacheBytes(): number {
  const raw = process.env.REMOTION_OFFTHREAD_CACHE_MB?.trim()
  if (raw) {
    const mb = Number.parseInt(raw, 10)
    if (Number.isFinite(mb) && mb >= 32) return mb * 1024 * 1024
  }
  if (process.env.NODE_ENV === 'development') return 64 * 1024 * 1024
  return 128 * 1024 * 1024
}

/** libx264 thread cap — prevents x264 auto-spawn (e.g. 24 threads) OOM on dev boxes. */
export function resolveFfmpegThreadCount(opts?: { mock?: boolean }): number {
  const raw = process.env.FFMPEG_THREADS?.trim()
  if (raw) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 1) return Math.min(parsed, 8)
  }
  if (opts?.mock || process.env.VIDEO_RENDER_MOCK === 'true') return 1
  if (process.env.NODE_ENV === 'development') return 2
  return Math.min(4, Math.max(1, Math.floor(os.cpus().length / 2)))
}

export function resolveFfmpegX264Preset(opts?: { mock?: boolean }): string {
  if (opts?.mock) return 'ultrafast'
  const raw = process.env.FFMPEG_X264_PRESET?.trim()
  if (raw) return raw
  return process.env.NODE_ENV === 'production' ? 'medium' : 'fast'
}

export function resolveRemotionX264Preset(): import('@remotion/renderer').X264Preset {
  const raw = process.env.REMOTION_X264_PRESET?.trim()
  const allowed = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow'] as const
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as import('@remotion/renderer').X264Preset
  }
  return process.env.NODE_ENV === 'production' ? 'medium' : 'fast'
}

export function resolveRemotionCrf(): number {
  const raw = process.env.REMOTION_CRF?.trim()
  if (raw) {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 0 && n <= 51) return n
  }
  return 23
}

/** Mock stub duration — matches content length; never force a 15s full-res encode. */
export function resolveMockRenderDurationSec(sceneDurationSec: number): number {
  const raw = process.env.MOCK_RENDER_SECONDS?.trim()
  if (raw) {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n) && n > 0) return Math.min(n, 60)
  }
  if (process.env.CI_QUICK_CUT_SMOKE === 'true') {
    const ciSec = Number(process.env.CI_SMOKE_MP4_SECONDS || 2)
    return Math.max(1, Math.min(ciSec, sceneDurationSec || ciSec))
  }
  return Math.min(8, Math.max(1, sceneDurationSec || 2))
}

/** Half-res mock encode unless MOCK_RENDER_FULL_RES=true — halves x264 frame buffers. */
export function resolveMockRenderResolution(): { width: number; height: number } {
  if (process.env.MOCK_RENDER_FULL_RES === 'true') {
    return { width: REEL_WIDTH, height: REEL_HEIGHT }
  }
  return { width: 540, height: 960 }
}

export function estimateRemotionRenderMemory(input: {
  durationInFrames: number
  concurrency: number
  sceneCount: number
  parallelEncodingDisabled: boolean
  dataUrlAssetCount?: number
  httpAssetCount?: number
}): RemotionRenderMemoryEstimate {
  const width = REEL_WIDTH
  const height = REEL_HEIGHT
  const fps = REEL_FPS
  const durationSec = input.durationInFrames / fps
  const frameBufferMb = (width * height * 4) / (1024 * 1024)
  const encodePipelineMb = frameBufferMb * 1.5
  const workerMb =
    input.concurrency * (frameBufferMb * 2 + encodePipelineMb) +
    (input.parallelEncodingDisabled ? encodePipelineMb : encodePipelineMb * 2)
  const dataUrlMb = (input.dataUrlAssetCount ?? 0) * 3
  const estimatedMemoryMb = Math.round(workerMb + dataUrlMb + 256)

  return {
    width,
    height,
    fps,
    durationSec: Math.round(durationSec * 10) / 10,
    durationInFrames: input.durationInFrames,
    concurrency: input.concurrency,
    sceneCount: input.sceneCount,
    parallelEncodingDisabled: input.parallelEncodingDisabled,
    estimatedMemoryMb,
    dataUrlAssetCount: input.dataUrlAssetCount ?? 0,
    httpAssetCount: input.httpAssetCount ?? 0,
  }
}

export function logRemotionRenderDiagnostics(estimate: RemotionRenderMemoryEstimate): void {
  console.info('[REMOTION_RENDER]')
  console.info(`Resolution: ${estimate.width}x${estimate.height}`)
  console.info(`FPS: ${estimate.fps}`)
  console.info(`Duration: ${estimate.durationSec}s`)
  console.info(`Frames: ${estimate.durationInFrames}`)
  console.info(`Concurrency: ${estimate.concurrency}`)
  console.info(
    `ParallelEncoding: ${estimate.parallelEncodingDisabled ? 'disabled' : 'enabled'}`
  )
  console.info(`EstimatedMemory: ~${estimate.estimatedMemoryMb} MB`)
  console.info(`Assets via URL: ${estimate.httpAssetCount}`)
  console.info(`Assets via Base64: ${estimate.dataUrlAssetCount}`)
}
