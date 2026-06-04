import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { parseReelTimeline } from '@/lib/reel/parse-reel-timeline'
import { retryWithBackoff } from '@/lib/video/retry.server'
import { scenesForReelExport } from '@/lib/reels/export-scenes.server'
import {
  findScenesMissingExportImages,
  missingScenesExportMessage,
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'
import { resolveExportScenes } from '@/lib/export/export-readiness.server'
import { refreshStoryboardUrl, storyboardStorageExists } from '@/lib/storyboard/storyboard-url-service.server'
import { exportApiCheckpoint } from '@/lib/export/export-api-checkpoints.server'
import type { CinematicScene } from '@/stores/cinematic-project'

export type ExportAssetValidation = {
  valid: boolean
  voiceExists: boolean
  imagesExist: boolean
  captionsExist: boolean
  timelineExists: boolean
  missing: string[]
  message: string | null
}

function validationLog(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') return
  console.info(`[Export Validation] ${event}`, payload)
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

function formatUnreachableSceneMessage(indices: number[]): string {
  const nums = indices
  const sceneWord = nums.length === 1 ? 'Scene' : 'Scenes'
  const verb = nums.length === 1 ? 'is' : 'are'
  const list =
    nums.length === 1
      ? String(nums[0])
      : nums.length === 2
        ? `${nums[0]} and ${nums[1]}`
        : `${nums.slice(0, -1).join(', ')}, and ${nums[nums.length - 1]}`
  return `Cannot export reel — ${sceneWord.toLowerCase()} ${list} ${verb} missing reachable storyboard images (link may have expired). Regenerate them, then try export again.`
}

/** Pre-render validation — surfaces missing assets before FFmpeg/Remotion starts. */
export async function validateExportAssets(params: {
  row: CinematicProjectRow
  userId: string
  includeVoiceover: boolean
  includeCaptions: boolean
  /** When set, skip a second full storyboard backfill (queue already hydrated). */
  hydratedScenes?: CinematicScene[]
}): Promise<ExportAssetValidation> {
  const missing: string[] = []
  exportApiCheckpoint('image_assets_loaded', {
    projectId: params.row.id,
    phase: 'validate_export_assets',
    hydrated: Boolean(params.hydratedScenes?.length),
  })
  const scenes =
    params.hydratedScenes?.length
      ? params.hydratedScenes
      : (await resolveExportScenes(params.row, params.userId, { skipHeavyBackfill: true })).scenes
  const exportScenes = scenesForReelExport(scenes)
  const voiceUrl = params.row.voice?.audioUrl?.trim() ?? null
  const timeline = parseReelTimeline(params.row.timeline_state)

  validationLog('start', {
    projectId: params.row.id,
    sceneCount: scenes.length,
    exportSceneCount: exportScenes.length,
  })

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
  let imagesExist = scenesMissingImages.length === 0 && exportScenes.length > 0

  if (scenesMissingImages.length > 0) {
    missing.push('images')
    validationLog('missing_paths', {
      scenes: scenesMissingImages.map((m) => m.index),
    })
  } else if (!imagesExist) {
    missing.push('images')
  } else {
    const unreachableIndices: number[] = []

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      const assetPath = resolveSceneExportAssetPath(scene)

      if (assetPath) {
        const exists = await storyboardStorageExists(assetPath)
        validationLog('scene.storage', {
          sceneIndex: i + 1,
          assetPath,
          exists,
        })
        if (!exists) {
          unreachableIndices.push(i + 1)
          continue
        }
        const refreshed = await refreshStoryboardUrl(assetPath)
        if (refreshed) {
          validationLog('scene.refreshed', { sceneIndex: i + 1 })
          continue
        }
      }

      const imageUrl = resolveSceneExportImageUrl(scene)
      if (!imageUrl?.trim()) {
        unreachableIndices.push(i + 1)
        continue
      }

      const reachable = await assetReachable(imageUrl)
      validationLog('scene.head', {
        sceneIndex: i + 1,
        reachable,
        hasAssetPath: Boolean(assetPath),
      })
      if (!reachable) {
        unreachableIndices.push(i + 1)
      }
    }

    imagesExist = unreachableIndices.length === 0
    if (!imagesExist) {
      missing.push('images')
      if (unreachableIndices.length > 0) {
        validationLog('failed', { unreachable: unreachableIndices })
        return {
          valid: false,
          voiceExists,
          imagesExist: false,
          captionsExist: false,
          timelineExists: Boolean(timeline?.clips?.length),
          missing,
          message: formatUnreachableSceneMessage(unreachableIndices),
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

  validationLog('complete', { projectId: params.row.id, valid, missing })

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
