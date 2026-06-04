import 'server-only'

import { resolveProjectScenes, type CinematicProjectRow } from '@/lib/cinematic-projects'
import type { CinematicScene } from '@/stores/cinematic-project'
import type { ExportRequestPayload } from '@/lib/export/export-schema'

type ClientSceneRow = {
  id: string
  title?: string | null
  imageUrl?: string | null
  imageAssetPath?: string | null
}

function pickClientScenes(body: ExportRequestPayload): ClientSceneRow[] | null {
  const fromStoryboards = body.storyboards
  const fromScenes = body.scenes
  const list = (fromStoryboards?.length ? fromStoryboards : fromScenes) ?? null
  if (!list?.length) return null
  return list
}

function mergeSceneRow(existing: CinematicScene, client: ClientSceneRow): CinematicScene {
  const imageUrl = existing.imageUrl?.trim() || client.imageUrl?.trim() || existing.imageUrl
  const imageAssetPath =
    existing.imageAssetPath?.trim() ||
    client.imageAssetPath?.trim() ||
    existing.imageAssetPath
  return {
    ...existing,
    ...(client.title?.trim() ? { title: client.title.trim() } : {}),
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
      const merged: CinematicScene[] = clientScenes.map((s, index) => ({
        id: s.id,
        index: index + 1,
        title: s.title?.trim() || `Scene ${index + 1}`,
        imageUrl: s.imageUrl?.trim() || undefined,
        imageAssetPath: s.imageAssetPath?.trim() || undefined,
      }))
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
