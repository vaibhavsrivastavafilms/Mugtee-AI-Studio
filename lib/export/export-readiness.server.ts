import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import type { CinematicScene } from '@/stores/cinematic-project'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  findScenesMissingExportImages,
  missingScenesExportMessage,
  resolveSceneExportImageUrl,
  VOICE_REQUIRED_EXPORT_MSG,
} from '@/lib/export/scene-export-validation'

export type ExportMissingAsset = {
  kind: 'image' | 'voice' | 'scene'
  sceneIndex?: number
  sceneId?: string
  message: string
}

export type ExportReadinessResult = {
  canExport: boolean
  imageCount: number
  requiredImages: number
  voiceoverCount: number
  assetCount: number
  sceneCount: number
  hasVoice: boolean
  missingAssets: ExportMissingAsset[]
  message: string | null
}

export type ProjectAssetCounts = {
  assetCount: number
  imageCount: number
  voiceoverCount: number
  imageAssets: Array<{
    id: string
    url: string
    sceneId: string | null
    sequenceIndex: number | null
  }>
}

export async function loadProjectAssetCounts(
  projectId: string,
  userId: string
): Promise<ProjectAssetCounts> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('project_assets')
    .select('id, kind, url, metadata')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .in('kind', ['image', 'voiceover'])

  if (error || !data?.length) {
    return { assetCount: 0, imageCount: 0, voiceoverCount: 0, imageAssets: [] }
  }

  const imageRows = data.filter((r) => r.kind === 'image' && r.url?.trim())
  const voiceRows = data.filter((r) => r.kind === 'voiceover')

  return {
    assetCount: data.length,
    imageCount: imageRows.length,
    voiceoverCount: voiceRows.length,
    imageAssets: imageRows.map((row) => {
      const meta = (row.metadata as Record<string, unknown> | null) ?? {}
      const sceneId =
        typeof meta.scene_id === 'string'
          ? meta.scene_id
          : typeof meta.sceneId === 'string'
            ? meta.sceneId
            : null
      const sequenceIndex =
        typeof meta.sequence_index === 'number'
          ? meta.sequence_index
          : typeof meta.sequenceIndex === 'number'
            ? meta.sequenceIndex
            : null
      return {
        id: row.id,
        url: row.url!.trim(),
        sceneId,
        sequenceIndex,
      }
    }),
  }
}

/** Merge project_assets image rows into scenes missing export stills (legacy repair). */
export function hydrateScenesFromProjectAssets(
  scenes: CinematicScene[],
  imageAssets: ProjectAssetCounts['imageAssets']
): CinematicScene[] {
  if (imageAssets.length < 1 || scenes.length < 1) return scenes

  const bySceneId = new Map<string, string>()
  const bySequence = new Map<number, string>()
  for (const asset of imageAssets) {
    if (asset.sceneId && !bySceneId.has(asset.sceneId)) {
      bySceneId.set(asset.sceneId, asset.url)
    }
    if (asset.sequenceIndex != null && !bySequence.has(asset.sequenceIndex)) {
      bySequence.set(asset.sequenceIndex, asset.url)
    }
  }

  return scenes.map((scene, index) => {
    if (resolveSceneExportImageUrl(scene)) return scene
    const fromId = scene.id ? bySceneId.get(scene.id) : undefined
    const fromSeq = bySequence.get(index + 1)
    const url = fromId ?? fromSeq
    if (!url) return scene
    return { ...scene, imageUrl: url }
  })
}

export function logExportAssetCounts(params: {
  projectId: string
  assetCount: number
  imageCount: number
  voiceoverCount: number
  sceneCount: number
  hydratedFromAssets?: number
}): void {
  console.info('[export] pre-export asset counts', {
    projectId: params.projectId,
    assetCount: params.assetCount,
    imageCount: params.imageCount,
    voiceoverCount: params.voiceoverCount,
    sceneCount: params.sceneCount,
    hydratedFromAssets: params.hydratedFromAssets ?? 0,
  })
}

export async function resolveExportScenes(
  row: CinematicProjectRow,
  userId: string
): Promise<{ scenes: CinematicScene[]; assetCounts: ProjectAssetCounts; hydratedCount: number }> {
  let assetCounts = await loadProjectAssetCounts(row.id, userId)
  const baseScenes = resolveProjectScenes(row)
  const before = baseScenes.filter((s) => resolveSceneExportImageUrl(s)).length

  const existingSceneIds = new Set(
    assetCounts.imageAssets.map((a) => a.sceneId).filter(Boolean) as string[]
  )
  const scenesWithImages = baseScenes.filter((s) => resolveSceneExportImageUrl(s))
  if (scenesWithImages.length > assetCounts.imageCount) {
    const { backfillProjectAssetsFromScenes } = await import(
      '@/lib/project-assets/persist-scene-image.server'
    )
    await backfillProjectAssetsFromScenes({
      userId,
      projectId: row.id,
      scenes: baseScenes,
      existingSceneIds,
    })
    assetCounts = await loadProjectAssetCounts(row.id, userId)
  }

  const scenes = hydrateScenesFromProjectAssets(baseScenes, assetCounts.imageAssets)
  const after = scenes.filter((s) => resolveSceneExportImageUrl(s)).length
  return {
    scenes,
    assetCounts,
    hydratedCount: Math.max(0, after - before),
  }
}

export function buildExportReadiness(params: {
  scenes: CinematicScene[]
  voiceUrl: string | null | undefined
  assetCounts: ProjectAssetCounts
  includeVoiceover?: boolean
}): ExportReadinessResult {
  const includeVoice = params.includeVoiceover !== false
  const sceneCount = params.scenes.length
  const requiredImages = sceneCount
  const imageCount = params.scenes.filter((s) => resolveSceneExportImageUrl(s)).length
  const voiceUrl = params.voiceUrl?.trim() ?? null
  const hasVoice = Boolean(voiceUrl)
  const missingAssets: ExportMissingAsset[] = []

  if (sceneCount < 1) {
    missingAssets.push({
      kind: 'scene',
      message: 'At least one storyboard scene is required.',
    })
  }

  const missingScenes = findScenesMissingExportImages(params.scenes)
  for (const m of missingScenes) {
    missingAssets.push({
      kind: 'image',
      sceneIndex: m.index,
      sceneId: m.id,
      message: `${m.title} is missing a storyboard image.`,
    })
  }

  if (includeVoice && !hasVoice) {
    missingAssets.push({
      kind: 'voice',
      message: VOICE_REQUIRED_EXPORT_MSG,
    })
  }

  const canExport =
    sceneCount > 0 && missingScenes.length === 0 && (!includeVoice || hasVoice)

  let message: string | null = null
  if (!canExport) {
    if (missingScenes.length > 0) {
      message = missingScenesExportMessage(missingScenes)
    } else if (includeVoice && !hasVoice) {
      message = VOICE_REQUIRED_EXPORT_MSG
    } else if (sceneCount < 1) {
      message = 'At least one storyboard scene is required.'
    }
  }

  return {
    canExport,
    imageCount,
    requiredImages,
    voiceoverCount: params.assetCounts.voiceoverCount,
    assetCount: params.assetCounts.assetCount,
    sceneCount,
    hasVoice,
    missingAssets,
    message,
  }
}

export async function getExportReadinessForProject(
  row: CinematicProjectRow,
  userId: string,
  opts?: { includeVoiceover?: boolean }
): Promise<ExportReadinessResult & { scenes: CinematicScene[] }> {
  const { scenes, assetCounts, hydratedCount } = await resolveExportScenes(row, userId)
  logExportAssetCounts({
    projectId: row.id,
    assetCount: assetCounts.assetCount,
    imageCount: assetCounts.imageCount,
    voiceoverCount: assetCounts.voiceoverCount,
    sceneCount: scenes.length,
    hydratedFromAssets: hydratedCount,
  })
  const readiness = buildExportReadiness({
    scenes,
    voiceUrl: row.voice?.audioUrl,
    assetCounts,
    includeVoiceover: opts?.includeVoiceover,
  })
  return { ...readiness, scenes }
}
