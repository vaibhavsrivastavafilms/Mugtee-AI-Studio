import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import { parseReelTimeline } from '@/lib/reel/parse-reel-timeline'
import { retryWithBackoff } from '@/lib/video/retry.server'
import { scenesForReelExport } from '@/lib/reels/export-api'
import {
  findScenesMissingExportImages,
  missingScenesExportMessage,
} from '@/lib/export/scene-export-validation'

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

  const scenesMissingImages = findScenesMissingExportImages(scenes)
  const imageUrls = exportScenes
    .map((s) => s.imageUrl?.trim())
    .filter((u): u is string => Boolean(u))
  let imagesExist = scenesMissingImages.length === 0 && imageUrls.length > 0
  if (scenesMissingImages.length > 0) {
    missing.push('images')
  } else if (!imagesExist) {
    missing.push('images')
  } else {
    const checks = await Promise.all(imageUrls.map((url) => assetReachable(url)))
    const unreachable = exportScenes
      .map((scene, i) => ({ scene, index: i + 1, url: scene.imageUrl?.trim() }))
      .filter((row, i) => row.url && !checks[i])
    imagesExist = checks.every(Boolean)
    if (!imagesExist) {
      missing.push('images')
      if (unreachable.length > 0) {
        const nums = unreachable.map((r) => r.index)
        const sceneWord = nums.length === 1 ? 'Scene' : 'Scenes'
        const verb = nums.length === 1 ? 'is' : 'are'
        const list =
          nums.length === 1
            ? String(nums[0])
            : nums.length === 2
              ? `${nums[0]} and ${nums[1]}`
              : `${nums.slice(0, -1).join(', ')}, and ${nums[nums.length - 1]}`
        return {
          valid: false,
          voiceExists,
          imagesExist: false,
          captionsExist: false,
          timelineExists: Boolean(timeline?.clips?.length),
          missing,
          message: `Cannot export reel — ${sceneWord.toLowerCase()} ${list} ${verb} missing reachable storyboard images (link may have expired). Regenerate them, then try export again.`,
        }
      }
    }
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
  let message: string | null = null
  if (!valid) {
    if (scenesMissingImages.length > 0) {
      message = missingScenesExportMessage(scenesMissingImages)
    } else if (missing.includes('voice') && !voiceUrl) {
      message = 'Voice narration is required before exporting a reel.'
    } else if (missing.includes('voice')) {
      message = 'Voice narration file is missing or unreachable. Regenerate voice, then try export again.'
    } else if (missing.includes('images')) {
      message = 'Storyboard images are missing or unreachable. Regenerate scenes, then try export again.'
    } else if (missing.includes('captions')) {
      message = 'Captions or script text is required for export with captions enabled.'
    } else {
      message = `Missing asset detected — ${missing.join(', ')}. Regenerating asset may be required.`
    }
  }

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
