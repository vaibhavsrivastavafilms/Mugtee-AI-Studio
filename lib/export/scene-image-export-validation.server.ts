import 'server-only'

import type { CinematicScene } from '@/stores/cinematic-project'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'
import { retryWithBackoff } from '@/lib/video/retry.server'
import {
  recoverSceneAssetPath,
  refreshStoryboardUrl,
  refreshSceneStoryboardUrls,
  storyboardStorageExists,
  type LegacyAssetLookup,
} from '@/lib/storyboard/storyboard-url-service.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type SceneImageValidationEntry = {
  sceneIndex: number
  sceneId: string
  imageUrl: string | null
  imageAssetPath: string | null
  storyboardImageCount: number
  storyboardUrls: string[]
  storyboardAssetPaths: string[]
  storage: 'FOUND' | 'MISSING'
  signedUrl: 'FRESH' | 'EXPIRED' | 'NONE'
  regenerated: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  validated: boolean
  freshSignedUrl: string | null
}

export type SceneImageValidationResult = {
  scenes: CinematicScene[]
  entries: SceneImageValidationEntry[]
  unreachableIndices: number[]
  reportLines: string[]
}

async function assetReachable(url: string): Promise<boolean> {
  if (!url?.trim()) return false
  if (url.startsWith('data:')) return true
  try {
    await retryWithBackoff(
      async () => {
        const getRes = await fetch(url, {
          headers: { Range: 'bytes=0-0' },
          signal: AbortSignal.timeout(30_000),
        })
        if (getRes.ok || getRes.status === 206) return
        const headRes = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(20_000),
        })
        if (headRes.ok || headRes.status === 405) return
        throw new Error(`Asset unreachable (${getRes.status})`)
      },
      { maxAttempts: 3, label: 'export scene image' }
    )
    return true
  } catch {
    return false
  }
}

function staleUrlLikelyExpired(url: string | null): boolean {
  if (!url?.trim()) return false
  return url.includes('/object/sign/') || url.includes('token=')
}

function buildReportLine(entry: SceneImageValidationEntry): string {
  const regen =
    entry.regenerated === 'SUCCESS'
      ? 'SUCCESS'
      : entry.regenerated === 'FAILED'
        ? 'FAILED'
        : 'SKIPPED'
  return [
    `Scene ${entry.sceneIndex}`,
    `  sceneId: ${entry.sceneId}`,
    `  imageUrl: ${entry.imageUrl ?? 'null'}`,
    `  imageAssetPath: ${entry.imageAssetPath ?? 'null'}`,
    `  storyboardImages: ${entry.storyboardImageCount}`,
    `  storage: ${entry.storage}`,
    `  signedUrl: ${entry.signedUrl}`,
    `  regenerated: ${regen}`,
    `  validated: ${entry.validated ? 'PASS' : 'FAIL'}`,
  ].join('\n')
}

export function logSceneImageValidationReport(
  projectId: string,
  result: SceneImageValidationResult
): void {
  console.group(`[Export Image Validation] projectId=${projectId}`)
  for (const line of result.reportLines) {
    console.info(line)
  }
  if (result.unreachableIndices.length) {
    console.warn('[Export Image Validation] unreachable scenes', result.unreachableIndices)
  }
  console.groupEnd()
}

/** Refresh storage-backed URLs, then validate reachability (never trust stale signed URLs). */
export async function refreshAndValidateExportSceneImages(params: {
  scenes: CinematicScene[]
  projectId: string
  userId: string
  lookup?: LegacyAssetLookup
}): Promise<SceneImageValidationResult> {
  const supabase = createSupabaseServerClient()
  const lookup: LegacyAssetLookup =
    params.lookup ?? {
      projectId: params.projectId,
      userId: params.userId,
    }

  let scenes = params.scenes
  for (let i = 0; i < scenes.length; i++) {
    scenes[i] = await refreshSceneStoryboardUrls(scenes[i], i, { lookup, supabase })
  }

  const entries: SceneImageValidationEntry[] = []
  const unreachableIndices: number[] = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const storyboard = scene.storyboardImages ?? []
    let assetPath =
      resolveSceneExportAssetPath(scene) ??
      (await recoverSceneAssetPath(scene, i, lookup, supabase))

    const persistedUrl = resolveSceneExportImageUrl(scene)
    let freshSignedUrl: string | null = null
    let storage: SceneImageValidationEntry['storage'] = 'MISSING'
    let signedUrl: SceneImageValidationEntry['signedUrl'] = 'NONE'
    let regenerated: SceneImageValidationEntry['regenerated'] = 'SKIPPED'
    let validated = false

    if (assetPath) {
      freshSignedUrl = await refreshStoryboardUrl(assetPath, supabase)
      if (freshSignedUrl) {
        regenerated = 'SUCCESS'
        signedUrl = 'FRESH'
        storage = 'FOUND'
        scenes[i] = {
          ...scene,
          imageAssetPath: assetPath,
          imageUrl: freshSignedUrl,
          storyboardImages: storyboard.length
            ? storyboard.map((img) => ({
                ...img,
                assetPath: img.assetPath ?? assetPath ?? undefined,
                url: freshSignedUrl ?? img.url ?? undefined,
              }))
            : scene.storyboardImages,
        }
        validated = await assetReachable(freshSignedUrl)
      } else {
        storage = (await storyboardStorageExists(assetPath, supabase)) ? 'FOUND' : 'MISSING'
        regenerated = 'FAILED'
        signedUrl = staleUrlLikelyExpired(persistedUrl) ? 'EXPIRED' : 'NONE'
      }
    }

    if (!validated && persistedUrl && !assetPath) {
      signedUrl = staleUrlLikelyExpired(persistedUrl) ? 'EXPIRED' : signedUrl
      validated = await assetReachable(persistedUrl)
      if (validated) signedUrl = 'FRESH'
    }

    if (!validated) {
      unreachableIndices.push(i + 1)
    }

    const entry: SceneImageValidationEntry = {
      sceneIndex: i + 1,
      sceneId: scene.id,
      imageUrl: persistedUrl,
      imageAssetPath: assetPath,
      storyboardImageCount: storyboard.length,
      storyboardUrls: storyboard.map((img) => img.url?.trim()).filter(Boolean) as string[],
      storyboardAssetPaths: storyboard
        .map((img) => img.assetPath?.trim())
        .filter(Boolean) as string[],
      storage,
      signedUrl,
      regenerated,
      validated,
      freshSignedUrl,
    }
    entries.push(entry)
  }

  const reportLines = entries.map(buildReportLine)

  return {
    scenes,
    entries,
    unreachableIndices,
    reportLines,
  }
}
