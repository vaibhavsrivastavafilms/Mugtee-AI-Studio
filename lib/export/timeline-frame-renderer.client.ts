'use client'

import type { ReelTimeline, ReelTimelineClip } from '@/lib/reel/types'

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

async function clipSource(clip: ReelTimelineClip): Promise<CanvasImageSource> {
  const url = clip.video?.trim() || clip.image?.trim()
  if (!url) throw new Error(`Clip ${clip.sceneId} has no image or video asset`)
  return loadImageSource(url)
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

  const clipSources = new Map<string, CanvasImageSource>()
  for (const clip of timeline.clips) {
    if (!clipSources.has(clip.sceneId)) {
      clipSources.set(clip.sceneId, await clipSource(clip))
    }
  }

  const frames: RenderedFrame[] = []

  for (let i = 0; i < frameCount; i++) {
    const t = i / fps
    const clip =
      timeline.clips.find((c) => t >= c.startSec && t < c.endSec) ??
      timeline.clips[timeline.clips.length - 1]
    if (!clip) break
    const source = clipSources.get(clip.sceneId)
    if (!source) continue

    const frameCanvas = useOffscreen
      ? new OffscreenCanvas(settings.width, settings.height)
      : document.createElement('canvas')
    frameCanvas.width = settings.width
    frameCanvas.height = settings.height
    const frameCtx = frameCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!frameCtx) throw new Error('2D canvas context unavailable')
    drawClip(frameCtx, source, settings.width, settings.height)

    const bitmap =
      frameCanvas instanceof OffscreenCanvas
        ? frameCanvas.transferToImageBitmap()
        : await createImageBitmap(frameCanvas as HTMLCanvasElement)
    frames.push({ bitmap, timestampUs: Math.round(t * 1_000_000) })
    onProgress?.((i + 1) / frameCount)
  }

  return frames
}

export async function revokeRenderedFrames(frames: RenderedFrame[]): Promise<void> {
  for (const f of frames) {
    try {
      f.bitmap.close()
    } catch {
      /* ignore */
    }
  }
}
