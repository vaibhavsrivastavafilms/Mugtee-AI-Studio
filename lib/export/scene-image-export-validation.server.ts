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
      { maxAttempts: 2, label: 'export scene image probe' }
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

  if (storage === 'FOUND') {
    const durableUrl = persistedUrl && !signedUrlIsExpired(persistedUrl) ? persistedUrl : null
    return {
      scene: { ...scene, imageAssetPath: assetPath, ...(durableUrl ? { imageUrl: durableUrl } : {}) },
      freshSignedUrl: durableUrl,
      storage: 'FOUND',
      signedUrl: 'NONE',
      regenerated: 'SKIPPED',
      validated: true,
      validationResult: 'PASS_STORAGE',
    }
  }

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
    scene: { ...scene, imageAssetPath: storage === 'FOUND' ? assetPath : undefined },
    freshSignedUrl: null,
    storage,
    signedUrl: wasExpired ? 'EXPIRED' : 'NONE',
    regenerated: storage === 'FOUND' ? 'FAILED' : 'FAILED',
    validated: false,
    validationResult: storage === 'FOUND' ? 'FAIL_NO_URL' : 'FAIL_MISSING_STORAGE',
  }
}

function buildReportLine(entry: SceneImageValidationEntry): string {
  return [
    `Scene ${entry.sceneIndex}`,
    `  sceneId: ${entry.sceneId}`,
    `  imageUrl: ${entry.imageUrl ?? 'null'}`,
    `  imageAssetPath: ${entry.imageAssetPath ?? 'null'}`,
    `  signedUrlExpiry: ${entry.signedUrlExpiry ?? 'null'}`,
    `  validationResult: ${entry.validationResult}`,
    `  storage: ${entry.storage}`,
    `  signedUrl: ${entry.signedUrl}`,
    `  regenerated: ${entry.regenerated}`,
    `  validated: ${entry.validated ? 'PASS' : 'FAIL'}`,
  ].join('\n')
}

export function logSceneImageValidationReport(
  projectId: string,
  result: SceneImageValidationResult
): void {
  console.group(`[EXPORT] asset_validation projectId=${projectId}`)
  for (const entry of result.entries) {
    logExportAssetCheck({
      projectId,
      sceneId: entry.sceneId,
      sceneIndex: entry.sceneIndex,
      imageUrl: entry.freshSignedUrl ?? entry.imageUrl,
      imageAssetPath: entry.imageAssetPath,
      signedUrlExpiry: entry.signedUrlExpiry,
      validationResult: entry.validationResult,
      storage: entry.storage,
      signedUrl: entry.signedUrl,
      regenerated: entry.regenerated,
      validated: entry.validated,
    })
  }
  for (const line of result.reportLines) {
    console.info(line)
  }
  if (result.unreachableIndices.length) {
    console.warn('[EXPORT] unreachable_scenes', {
      projectId,
      scenes: result.unreachableIndices,
      reason: 'storage_missing_or_no_durable_path',
    })
  }
  console.groupEnd()
}

/** Refresh storage-backed URLs; storage path is source of truth (never fail on stale signed URLs alone). */
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
    let scene = scenes[i]
    const storyboard = scene.storyboardImages ?? []
    const persistedUrl = resolveSceneExportImageUrl(scene)

    let assetPath =
      resolveSceneExportAssetPath(scene) ??
      (await recoverSceneAssetPath(scene, i, lookup, supabase)) ??
      extractStoragePathFromUrl(persistedUrl)

    if (assetPath && !(await storyboardStorageExists(assetPath, supabase))) {
      assetPath = extractStoragePathFromUrl(persistedUrl)
    }

    let freshSignedUrl: string | null = null
    let storage: SceneImageValidationEntry['storage'] = 'MISSING'
    let signedUrl: SceneImageValidationEntry['signedUrl'] = signedUrlIsExpired(persistedUrl)
      ? 'EXPIRED'
      : 'NONE'
    let regenerated: SceneImageValidationEntry['regenerated'] = 'SKIPPED'
    let validated = false
    let validationResult: SceneImageValidationEntry['validationResult'] = 'FAIL_NO_URL'

    if (assetPath) {
      const refreshed = await refreshExportImageFromStorage({
        scene,
        sceneIndex: i,
        assetPath,
        persistedUrl,
        lookup,
        supabase,
        projectId: params.projectId,
      })
      scene = refreshed.scene
      scenes[i] = scene
      freshSignedUrl = refreshed.freshSignedUrl
      storage = refreshed.storage
      signedUrl = refreshed.signedUrl
      regenerated = refreshed.regenerated
      validated = refreshed.validated
      validationResult = refreshed.validationResult

      if (validated && freshSignedUrl) {
        const httpOk = await probeUrlReachable(freshSignedUrl)
        if (httpOk) validationResult = 'PASS_HTTP'
      }
    }

    if (!validated && persistedUrl) {
      const persisted = await persistEphemeralSceneImageForExport({
        scene,
        sceneIndex: i,
        imageUrl: persistedUrl,
        lookup,
        supabase,
      })
      if (persisted) {
        scene = persisted
        scenes[i] = scene
        assetPath = resolveSceneExportAssetPath(scene)
        freshSignedUrl = resolveSceneExportImageUrl(scene)
        validated = true
        storage = 'FOUND'
        signedUrl = 'FRESH'
        regenerated = 'SUCCESS'
        validationResult = 'PASS_STORAGE'
      }
    }

    if (!validated && persistedUrl && !assetPath) {
      const httpOk = await probeUrlReachable(persistedUrl)
      if (httpOk) {
        validated = true
        signedUrl = 'FRESH'
        validationResult = 'PASS_HTTP'
        freshSignedUrl = persistedUrl
      } else if (signedUrlIsExpired(persistedUrl)) {
        signedUrl = 'EXPIRED'
        validationResult = 'FAIL_NO_URL'
      }
    }

    if (!validated) {
      unreachableIndices.push(i + 1)
    }

    entries.push({
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
      signedUrlExpiry: parseSignedUrlExpiry(persistedUrl),
      validationResult,
    })
  }

  return {
    scenes,
    entries,
    unreachableIndices,
    reportLines: entries.map(buildReportLine),
  }
}
