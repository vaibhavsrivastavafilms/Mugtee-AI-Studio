'use client'

import type { SceneExportImageSource } from '@/lib/export/scene-export-validation'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'

export type ExportRequestSceneRow = {
  id: string
  title?: string | null
  imageUrl?: string | null
  imageAssetPath?: string | null
}

/** Map scene/storyboard state to export API rows (includes storyboardImages fallback). */
export function resolveExportSceneId(scene: SceneExportImageSource, index: number): string {
  if (typeof scene.id === 'string' && scene.id.trim()) return scene.id.trim()
  const alt = (scene as { sceneId?: string }).sceneId
  if (typeof alt === 'string' && alt.trim()) return alt.trim()
  return `scene-${index + 1}`
}

export function sceneToExportRequestRow(
  scene: SceneExportImageSource,
  index = 0
): ExportRequestSceneRow {
  return {
    id: resolveExportSceneId(scene, index),
    title: scene.title ?? null,
    imageUrl: resolveSceneExportImageUrl(scene) ?? null,
    imageAssetPath: resolveSceneExportAssetPath(scene) ?? null,
  }
}

export function scenesToExportRequestPayload(scenes: SceneExportImageSource[]): {
  scenes: ExportRequestSceneRow[]
  storyboards: ExportRequestSceneRow[]
} {
  const rows = scenes.map((scene, index) => sceneToExportRequestRow(scene, index))
  return { scenes: rows, storyboards: rows }
}

/** Prefer non-empty storyboard array; empty [] must not shadow populated scenes. */
export function pickExportStoryboardScenes<T extends SceneExportImageSource>(
  storyboard: T[] | null | undefined,
  scenes: T[]
): T[] {
  if (storyboard && storyboard.length > 0) return storyboard
  return scenes
}
