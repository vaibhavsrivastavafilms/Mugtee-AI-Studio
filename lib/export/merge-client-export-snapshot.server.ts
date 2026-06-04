import 'server-only'

import { resolveProjectScenes, type CinematicProjectRow } from '@/lib/cinematic-projects'
import type { CinematicScene } from '@/stores/cinematic-project'
import type { ExportRequestPayload } from '@/lib/export/export-schema'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
  type SceneExportImageSource,
} from '@/lib/export/scene-export-validation'

type ClientSceneRow = {
  id: string
  title?: string | null
  imageUrl?: string | null
  imageAssetPath?: string | null
}

function pickClientScenes(body: ExportRequestPayload): ClientSceneRow[] | null {
  const fromStoryboards = body.storyboards
  const fromScenes = body.scenes
  const list =
    fromStoryboards && fromStoryboards.length > 0
      ? fromStoryboards
      : fromScenes && fromScenes.length > 0
        ? fromScenes
        : null
  if (!list?.length) return null
  return list.map(normalizeClientSceneRow)
}

function normalizeClientSceneRow(client: ClientSceneRow): ClientSceneRow {
  const source = client as SceneExportImageSource
  const imageUrl =
    client.imageUrl?.trim() || resolveSceneExportImageUrl(source) || client.imageUrl
  const imageAssetPath =
    client.imageAssetPath?.trim() ||
    resolveSceneExportAssetPath(source) ||
    client.imageAssetPath
  return {
    ...client,
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageAssetPath ? { imageAssetPath } : {}),
  }
}

function mergeSceneRow(existing: CinematicScene, client: ClientSceneRow): CinematicScene {
  const normalized = normalizeClientSceneRow(client)
  const imageUrl =
    existing.imageUrl?.trim() || normalized.imageUrl?.trim() || existing.imageUrl
  const imageAssetPath =
    existing.imageAssetPath?.trim() ||
    normalized.imageAssetPath?.trim() ||
    existing.imageAssetPath
  return {
    ...existing,
    ...(normalized.title?.trim() ? { title: normalized.title.trim() } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageAssetPath ? { imageAssetPath } : {}),
  }
}

/**
 * Merge optional client export snapshot into the DB row so readiness checks see
 * in-memory storyboard stills when the project row is stale.
 */
export function mergeClientExportSnapshot(
  row: CinematicProjectRow,
  body: ExportRequestPayload
): CinematicProjectRow {
  let next: CinematicProjectRow = { ...row }
  const clientScenes = pickClientScenes(body)

  if (clientScenes?.length) {
    const existing = resolveProjectScenes(row)
    if (existing.length > 0) {
      const byId = new Map(clientScenes.map((s) => [s.id, s]))
      const merged = existing.map((scene) => {
        const client = byId.get(scene.id)
        return client ? mergeSceneRow(scene, client) : scene
      })
      next = { ...next, scenes: merged, storyboard: merged }
    } else {
      const merged: CinematicScene[] = clientScenes.map((s, index) => {
        const normalized = normalizeClientSceneRow(s)
        return {
          id: normalized.id,
          index: index + 1,
          title: normalized.title?.trim() || `Scene ${index + 1}`,
          imageUrl: normalized.imageUrl?.trim() || undefined,
          imageAssetPath: normalized.imageAssetPath?.trim() || undefined,
        }
      })
      next = { ...next, scenes: merged, storyboard: merged }
    }
  }

  const voiceUrl = (body.voiceUrl ?? body.voiceover)?.trim()
  if (voiceUrl && !next.voice?.audioUrl?.trim()) {
    next = {
      ...next,
      voice: { ...(next.voice ?? {}), audioUrl: voiceUrl },
    }
  }

  const script = body.script?.trim()
  if (script && !next.script?.trim()) {
    next = { ...next, script }
  }

  const thumb = (body.thumbnailUrl ?? body.thumbnail)?.trim()
  if (thumb && !next.thumbnail_url?.trim()) {
    next = { ...next, thumbnail_url: thumb }
  }

  return next
}
