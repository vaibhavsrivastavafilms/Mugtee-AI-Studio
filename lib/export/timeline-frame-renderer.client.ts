'use client'

import type { ReelTimeline, ReelTimelineClip } from '@/lib/reel/types'
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/lib/export/export-placeholders'
import { mugteeExportLog } from '@/lib/export/export-log.client'

export type RenderedFrame = {
  bitmap: ImageBitmap
  timestampUs: number
}

async function loadImageSource(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load frame asset: ${url}`))
    img.src = url
  })
}

function drawPlaceholderFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  label: string
): void {
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, width, height)
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#1a1a24')
  gradient.addColorStop(1, '#0f0f16')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(212, 175, 55, 0.85)'
  ctx.font = `600 ${Math.round(width * 0.04)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, width / 2, height / 2)
}

function drawClip(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  const sw =
    'width' in source && typeof source.width === 'number' ? source.width : width
  const sh =
    'height' in source && typeof source.height === 'number' ? source.height : height
  const scale = Math.max(width / sw, height / sh)
  const dw = sw * scale
  const dh = sh * scale
  const dx = (width - dw) / 2
  const dy = (height - dh) / 2
  ctx.drawImage(source, dx, dy, dw, dh)
}

async function clipSource(
  clip: ReelTimelineClip,
  width: number,
  height: number
): Promise<CanvasImageSource> {
  const url = clip.video?.trim() || clip.image?.trim() || DEFAULT_PLACEHOLDER_IMAGE
  if (!clip.image?.trim() && !clip.video?.trim()) {
    mugteeExportLog('compiler.placeholder_clip', { sceneId: clip.sceneId })
  }
  try {
    return await loadImageSource(url)
  } catch {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')
    drawPlaceholderFrame(ctx, width, height, clip.title?.trim() || 'Scene')
    return canvas
  }
}

function bitmapFromCanvas(
  frameCanvas: OffscreenCanvas | HTMLCanvasElement
): ImageBitmap | Promise<ImageBitmap> {
  if (frameCanvas instanceof OffscreenCanvas) {
    const transfer = frameCanvas.transferToImageBitmap
    if (typeof transfer !== 'function') {
      throw new Error('OffscreenCanvas transferToImageBitmap unavailable')
    }
    return transfer.call(frameCanvas)
  }
  if (typeof createImageBitmap !== 'function') {
    throw new Error('createImageBitmap unavailable — try a newer browser or server compile')
  }
  return createImageBitmap(frameCanvas)
}

export async function renderTimelineToFrames(
  timeline: ReelTimeline,
  settings: { width: number; height: number; fps: number; durationSec?: number },
  onProgress?: (ratio: number) => void
): Promise<RenderedFrame[]> {
  const fps = settings.fps
  const totalSec = settings.durationSec ?? timeline.totalDurationSec
  const frameCount = Math.max(1, Math.ceil(totalSec * fps))
  const useOffscreen = typeof OffscreenCanvas !== 'undefined'

  mugteeExportLog('compiler.start', {
    clipCount: timeline.clips.length,
    frameCount,
    durationSec: totalSec,
  })

  const clipSources = new Map<string, CanvasImageSource>()
  for (const clip of timeline.clips) {
    if (!clipSources.has(clip.sceneId)) {
      clipSources.set(
        clip.sceneId,
        await clipSource(clip, settings.width, settings.height)
      )
    }
  }

  const frames: RenderedFrame[] = []

  for (let i = 0; i < frameCount; i++) {
    const t = i / fps
    const clip =
      timeline.clips.find((c) => t >= c.startSec && t < c.endSec) ??
      timeline.clips[timeline.clips.length - 1]
    if (!clip) break
    const source =
      clipSources.get(clip.sceneId) ??
      (await clipSource(clip, settings.width, settings.height))

    const frameCanvas = useOffscreen
      ? new OffscreenCanvas(settings.width, settings.height)
      : document.createElement('canvas')
    frameCanvas.width = settings.width
    frameCanvas.height = settings.height
    const frameCtx = frameCanvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null
    if (!frameCtx) throw new Error('2D canvas context unavailable')
    drawClip(frameCtx, source, settings.width, settings.height)

    const bitmap = await Promise.resolve(bitmapFromCanvas(frameCanvas))
    frames.push({ bitmap, timestampUs: Math.round(t * 1_000_000) })
    onProgress?.((i + 1) / frameCount)
  }

  mugteeExportLog('compiler.complete', { frameCount: frames.length })
  return frames
}

export async function revokeRenderedFrames(frames: RenderedFrame[]): Promise<void> {
  for (const f of frames) {
    try {
      if (typeof f.bitmap.close === 'function') {
        f.bitmap.close()
      }
    } catch {
      /* ignore */
    }
  }
}
