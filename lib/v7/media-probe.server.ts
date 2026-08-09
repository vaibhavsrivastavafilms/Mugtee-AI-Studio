import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { downloadToFile } from '@/lib/video/download-asset'
import { validateLocalVideoFile } from '@/lib/v7/providers/video-provider-base.server'
import { buildV7ScenePackages } from '@/lib/v7/scene-package.server'
import { isSlideshowOrFallbackVideo } from '@/lib/v7/production-integrity.server'
import type { V7ProductionSnapshot } from '@/types/v7/production'

export async function probeRemoteVideoAsset(
  url: string,
  expectedDurationSec?: number
): Promise<{ valid: boolean; durationSec: number; codec?: string; error?: string }> {
  if (!url?.trim()) {
    return { valid: false, durationSec: 0, error: 'missing_url' }
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-v7-probe-'))
  const localPath = path.join(workDir, 'scene.mp4')

  try {
    await downloadToFile(url, localPath)
    return await validateLocalVideoFile(localPath, expectedDurationSec)
  } catch (err) {
    return {
      valid: false,
      durationSec: 0,
      error: err instanceof Error ? err.message : 'probe_failed',
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/** FFprobe-equivalent validation for every persisted scene video before render. */
export async function validateV7ProductionMediaAssets(
  snapshot: V7ProductionSnapshot
): Promise<string[]> {
  const issues: string[] = []
  const packages = buildV7ScenePackages(snapshot)

  for (const pkg of packages) {
    const label = `Scene ${pkg.sceneNumber}`
    const scene = snapshot.scenes.find((row) => row.id === pkg.sceneId)
    const board = (scene?.storyboard ?? {}) as Record<string, unknown>
    const videoMeta = board.videoMetadata as { provider?: string; fallback?: boolean } | undefined

    if (
      isSlideshowOrFallbackVideo({
        provider: videoMeta?.provider ?? pkg.videoProvider,
        fallback: videoMeta?.fallback,
        videoUrl: pkg.videoUrl,
        imageUrl: pkg.imageUrl,
      })
    ) {
      issues.push(`${label}: slideshow/Ken Burns video rejected — real AI scene video required`)
      continue
    }

    if (!pkg.videoUrl?.trim()) {
      issues.push(`${label}: scene video URL missing`)
      continue
    }

    const probe = await probeRemoteVideoAsset(pkg.videoUrl, pkg.durationSec)
    if (!probe.valid) {
      issues.push(
        `${label}: scene video failed media probe (${probe.error ?? 'invalid'}) — URL may be broken or not a playable MP4`
      )
    }
  }

  return issues
}
