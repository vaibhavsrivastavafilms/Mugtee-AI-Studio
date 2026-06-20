import 'server-only'

import type { CinematicScene } from '@/stores/cinematic-project'
import {
  isEphemeralExportImageUrl,
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import { retryWithBackoff } from '@/lib/video/retry.server'
import {
  recoverSceneAssetPath,
  refreshStoryboardUrl,
  refreshSceneStoryboardUrls,
  storyboardStorageExists,
  type LegacyAssetLookup,
} from '@/lib/storyboard/storyboard-url-service.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { assertNever } from '@/lib/utils/assert-never'

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
  signedUrlExpiry: string | null
  validationResult: 'PASS' | 'PASS_STORAGE' | 'PASS_HTTP' | 'FAIL_MISSING_STORAGE' | 'FAIL_NO_URL'
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

function parseSignedUrlExpiry(url: string | null): string | null {
  if (!url?.trim()) return null
  try {
    const token = new URL(url).searchParams.get('token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    ) as { exp?: number }
    if (typeof payload.exp !== 'number') return null
    return new Date(payload.exp * 1000).toISOString()
  } catch {
    return null
  }
}

function signedUrlIsExpired(url: string | null): boolean {
  const expiry = parseSignedUrlExpiry(url)
  if (!expiry) return staleUrlLikelyExpired(url)
  return Date.parse(expiry) <= Date.now()
}

async function probeUrlReachable(url: string): Promise<boolean> {
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
      { maxAttempts: 3, label: 'export scene image probe' }
    )
    return true
  } catch {
    return false
  }
}

function logAssetRefresh(payload: Record<string, unknown>): void {
  console.info('[ASSET_REFRESH]', payload)
}

function logExportAssetCheck(payload: Record<string, unknown>): void {
  console.info('[EXPORT_ASSET_CHECK]', payload)
}

async function persistEphemeralSceneImageForExport(params: {
  scene: CinematicScene
  sceneIndex: number
  imageUrl: string
  lookup: LegacyAssetLookup
  supabase: ReturnType<typeof createSupabaseServerClient>
}): Promise<CinematicScene | null> {
  if (!isEphemeralExportImageUrl(params.imageUrl)) return null
  const filename = `${params.lookup.userId}/faceless/scene_${params.scene.id}_${Date.now()}_${params.sceneIndex}.png`
  const { persistRemoteImage } = await import('@/lib/ai/generate-scene-image')
  const uploaded = await persistRemoteImage({
    remoteUrl: params.imageUrl,
    userId: params.lookup.userId,
    filename,
  })
  const assetPath = extractStoragePathFromUrl(uploaded)
  if (!assetPath || !(await storyboardStorageExists(assetPath, params.supabase))) {
    return null
  }
  const freshSignedUrl = (await refreshStoryboardUrl(assetPath, params.supabase)) ?? uploaded
  logExportAssetCheck({
    projectId: params.lookup.projectId,
    sceneId: params.scene.id,
    sceneIndex: params.sceneIndex + 1,
    imageAssetPath: assetPath,
    freshSignedUrl,
    validationResult: 'PASS_STORAGE',
    action: 'persist_ephemeral',
  })
  return applyFreshUrlToScene(params.scene, assetPath, freshSignedUrl)
}

function applyFreshUrlToScene(
  scene: CinematicScene,
  assetPath: string,
  freshSignedUrl: string
): CinematicScene {
  const storyboard = scene.storyboardImages ?? []
  return {
    ...scene,
    imageAssetPath: assetPath,
    imageUrl: freshSignedUrl,
    storyboardImages: storyboard.length
      ? storyboard.map((img) => ({
          ...img,
          assetPath: img.assetPath ?? assetPath,
          url: freshSignedUrl,
        }))
      : scene.storyboardImages,
  }
}

async function refreshExportImageFromStorage(params: {
  scene: CinematicScene
  sceneIndex: number
  assetPath: string
  persistedUrl: string | null
  lookup: LegacyAssetLookup
  supabase: ReturnType<typeof createSupabaseServerClient>
  projectId: string
}): Promise<{
  scene: CinematicScene
  freshSignedUrl: string | null
  storage: 'FOUND' | 'MISSING'
  signedUrl: 'FRESH' | 'EXPIRED' | 'NONE'
  regenerated: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  validated: boolean
  validationResult: SceneImageValidationEntry['validationResult']
}> {
  const { assetPath, persistedUrl, supabase, projectId, scene } = params
  const wasExpired = signedUrlIsExpired(persistedUrl)

  logAssetRefresh({
    projectId,
    sceneId: scene.id,
    sceneIndex: params.sceneIndex + 1,
    imageAssetPath: assetPath,
    priorImageUrl: persistedUrl,
    priorSignedUrlExpiry: parseSignedUrlExpiry(persistedUrl),
    priorExpired: wasExpired,
  })

  let freshSignedUrl = await refreshStoryboardUrl(assetPath, supabase)
  let storage: 'FOUND' | 'MISSING' = freshSignedUrl ? 'FOUND' : 'MISSING'

  if (!freshSignedUrl) {
    const exists = await storyboardStorageExists(assetPath, supabase)
    storage = exists ? 'FOUND' : 'MISSING'
    if (exists) {
      freshSignedUrl = await refreshStoryboardUrl(assetPath, supabase)
    }
  }

  if (freshSignedUrl) {
    logAssetRefresh({
      projectId,
      sceneId: scene.id,
      sceneIndex: params.sceneIndex + 1,
      imageAssetPath: assetPath,
      freshSignedUrl,
      freshSignedUrlExpiry: parseSignedUrlExpiry(freshSignedUrl),
      result: 'regenerated',
    })
    return {
      scene: applyFreshUrlToScene(scene, assetPath, freshSignedUrl),
      freshSignedUrl,
      storage: 'FOUND',
      signedUrl: 'FRESH',
      regenerated: 'SUCCESS',
      validated: true,
      validationResult: 'PASS_STORAGE',
    }
  }

  switch (storage) {
    case 'FOUND': {
      const durableUrl =
        persistedUrl && !signedUrlIsExpired(persistedUrl) ? persistedUrl : null
      return {
        scene: {
          ...scene,
          imageAssetPath: assetPath,
          ...(durableUrl ? { imageUrl: durableUrl } : {}),
        },
        freshSignedUrl: durableUrl,
        storage: 'FOUND',
        signedUrl: 'NONE',
        regenerated: 'SKIPPED',
        validated: true,
        validationResult: 'PASS_STORAGE',
      }
    }
    case 'MISSING': {
      if (persistedUrl && (await probeUrlReachable(persistedUrl))) {
        return {
          scene: { ...scene, imageUrl: persistedUrl, imageAssetPath: undefined },
          freshSignedUrl: persistedUrl,
          storage: 'MISSING',
          signedUrl: 'FRESH',
          regenerated: 'SKIPPED',
          validated: true,
          validationResult: 'PASS_HTTP',
        }
      }
      return {
        scene: { ...scene, imageAssetPath: undefined },
        freshSignedUrl: null,
        storage: 'MISSING',
        signedUrl: wasExpired ? 'EXPIRED' : 'NONE',
        regenerated: 'FAILED',
        validated: false,
        validationResult: 'FAIL_MISSING_STORAGE',
      }
    }
    default:
      return assertNever(storage)
  }
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
      signedUrlExpiry: parseSignedUrlExpiry(freshSignedUrl ?? persistedUrl),
      validationResult: validated
        ? storage === 'FOUND'
          ? 'PASS_STORAGE'
          : 'PASS_HTTP'
        : assetPath
          ? 'FAIL_MISSING_STORAGE'
          : persistedUrl
            ? 'FAIL_MISSING_STORAGE'
            : 'FAIL_NO_URL',
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
