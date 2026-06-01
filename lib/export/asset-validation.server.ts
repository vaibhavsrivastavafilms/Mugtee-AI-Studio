import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import { parseReelTimeline } from '@/lib/reel/parse-reel-timeline'
import { retryWithBackoff } from '@/lib/video/retry.server'
import { scenesForReelExport } from '@/lib/reels/export-api'

export type ExportAssetValidation = {
  valid: boolean
  voiceExists: boolean
  imagesExist: boolean
  captionsExist: boolean
  timelineExists: boolean
  missing: string[]
  message: string | null
}

async function assetReachable(url: string): Promise<boolean> {
  if (!url?.trim()) return false
  if (url.startsWith('data:')) return true
  try {
    await retryWithBackoff(
      async () => {
        const res = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(20_000),
        })
        if (!res.ok && res.status !== 405) {
          const getRes = await fetch(url, { signal: AbortSignal.timeout(30_000) })
          if (!getRes.ok) throw new Error(`Asset unreachable (${getRes.status})`)
        }
      },
      { maxAttempts: 3, label: 'asset HEAD' }
    )
    return true
  } catch {
    return false
  }
}

/** Pre-render validation — surfaces missing assets before FFmpeg/Remotion starts. */
export async function validateExportAssets(params: {
  row: CinematicProjectRow
  includeVoiceover: boolean
  includeCaptions: boolean
}): Promise<ExportAssetValidation> {
  const missing: string[] = []
  const scenes = resolveProjectScenes(params.row)
  const exportScenes = scenesForReelExport(scenes)
  const voiceUrl = params.row.voice?.audioUrl?.trim() ?? null
  const timeline = parseReelTimeline(params.row.timeline_state)

  let voiceExists = !params.includeVoiceover
  if (params.includeVoiceover) {
    if (!voiceUrl) {
      missing.push('voice')
    } else {
      voiceExists = await assetReachable(voiceUrl)
      if (!voiceExists) missing.push('voice')
    }
  }

  const imageUrls = exportScenes
    .map((s) => s.imageUrl?.trim())
    .filter((u): u is string => Boolean(u))
  let imagesExist = imageUrls.length > 0
  if (!imagesExist) {
    missing.push('images')
  } else {
    const checks = await Promise.all(imageUrls.slice(0, 6).map((url) => assetReachable(url)))
    imagesExist = checks.some(Boolean)
    if (!imagesExist) missing.push('images')
  }

  const timelineExists = Boolean(timeline?.clips?.length)
  const captionsExist =
    Boolean(timeline?.clips?.some((c) => c.caption?.text?.trim())) ||
    Boolean(params.row.script?.trim()) ||
    !params.includeCaptions

  if (params.includeCaptions && !captionsExist) {
    missing.push('captions')
  }

  const valid = missing.length === 0
  const message = valid
    ? null
    : `Missing asset detected — ${missing.join(', ')}. Regenerating asset may be required.`

  return {
    valid,
    voiceExists,
    imagesExist,
    captionsExist,
    timelineExists,
    missing,
    message,
  }
}
