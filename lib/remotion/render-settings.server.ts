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
  return 128 * 1024 * 1024
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
