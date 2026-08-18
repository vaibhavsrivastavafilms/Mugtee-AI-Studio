import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import { validateLocalVideoFile } from '@/lib/v7/providers/video-provider-base.server'
import { downloadToFile } from '@/lib/video/download-asset'

export class RenderMediaSourceInvalidError extends Error {
  readonly code = 'RENDER_MEDIA_SOURCE_INVALID' as const

  constructor(message: string) {
    super(message)
    this.name = 'RenderMediaSourceInvalidError'
  }
}

export type RenderMediaSourceType = 'URL' | 'DATA_URI' | 'LOCAL_PATH' | 'INVALID'

export function classifyRenderMediaSource(source: string | null | undefined): RenderMediaSourceType {
  const value = source?.trim() ?? ''
  if (!value) return 'INVALID'
  if (value.startsWith('data:')) return 'DATA_URI'
  if (/^https?:\/\//i.test(value)) return 'URL'
  if (value.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('/')) {
    return 'LOCAL_PATH'
  }
  return 'INVALID'
}

export function sanitizeRenderUrlForLog(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.slice(0, 160)
  }
}

/** Path served by Remotion bundle static server — avoids proxy re-download of remote MP4s. */
export function toRemotionBundlePublicSrc(relativeUnderPublic: string): string {
  const trimmed = relativeUnderPublic
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
  return `/public/${trimmed}`
}

/**
 * Copy a local asset into the Remotion webpack bundle public dir so Chrome
 * fetches it over the bundle HTTP server. Do not inline as data URLs —
 * Chromium keeps those strings + decoded buffers in the page heap for the
 * entire renderMedia screenshot session.
 */
export async function stageLocalFileForRemotionBundle(input: {
  localPath: string
  renderPublicDir: string
  renderSessionKey: string
  publicFileName: string
}): Promise<string> {
  const dest = path.join(input.renderPublicDir, input.publicFileName)
  await fs.copyFile(input.localPath, dest)
  return toRemotionBundlePublicSrc(
    `mugtee-render/${input.renderSessionKey}/${input.publicFileName}`
  )
}

export function sanitizeRenderSessionKey(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return cleaned || 'session'
}

async function probeRemoteVideo(url: string): Promise<{ contentType: string; contentLength: number | null }> {
  const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) }).catch(() => null)
  if (head?.ok) {
    return {
      contentType: head.headers.get('content-type') ?? '',
      contentLength: Number(head.headers.get('content-length') ?? NaN) || null,
    }
  }

  const ranged = await fetch(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-8191' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!ranged.ok) {
    throw new RenderMediaSourceInvalidError(`HTTP ${ranged.status} for ${sanitizeRenderUrlForLog(url)}`)
  }

  return {
    contentType: ranged.headers.get('content-type') ?? '',
    contentLength: Number(ranged.headers.get('content-length') ?? NaN) || null,
  }
}

export async function validateSceneVideoSourcesForRender(scenes: GeneratedScene[]): Promise<void> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-render-validate-'))
  try {
    for (let index = 0; index < scenes.length; index++) {
      const sceneNumber = index + 1
      const videoUrl = scenes[index]?.videoUrl?.trim() ?? ''

      console.info('[render] Scene', sceneNumber, 'video URL:', videoUrl || 'MISSING')

      const sourceType = classifyRenderMediaSource(videoUrl)
      console.info('[render] Scene', sceneNumber, 'source type:', sourceType)
      console.info('[render] Scene', sceneNumber, 'source:', sanitizeRenderUrlForLog(videoUrl))

      if (!videoUrl) {
        throw new RenderMediaSourceInvalidError(`Scene ${sceneNumber}: persisted video URL missing`)
      }
      if (sourceType === 'DATA_URI') {
        throw new RenderMediaSourceInvalidError(
          `Scene ${sceneNumber}: DATA_URI is not allowed — use persisted Supabase MP4 URL`
        )
      }
      if (sourceType !== 'URL') {
        throw new RenderMediaSourceInvalidError(`Scene ${sceneNumber}: invalid media source (${sourceType})`)
      }

      const remote = await probeRemoteVideo(videoUrl)
      if (!remote.contentType.includes('video') && !videoUrl.toLowerCase().endsWith('.mp4')) {
        throw new RenderMediaSourceInvalidError(
          `Scene ${sceneNumber}: expected video/mp4, got ${remote.contentType || 'unknown'}`
        )
      }
      if (remote.contentLength != null && remote.contentLength <= 0) {
        throw new RenderMediaSourceInvalidError(`Scene ${sceneNumber}: zero content length`)
      }

      const localPath = path.join(workDir, `scene_${sceneNumber}.mp4`)
      await downloadToFile(videoUrl, localPath)
      const ffprobe = await validateLocalVideoFile(localPath)
      if (!ffprobe.valid) {
        throw new RenderMediaSourceInvalidError(
          `Scene ${sceneNumber}: FFprobe failed (${ffprobe.error ?? 'invalid'})`
        )
      }

      console.info(
        '[render] Scene',
        sceneNumber,
        'FFprobe: PASS',
        `(${ffprobe.durationSec.toFixed(2)}s)`
      )
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
