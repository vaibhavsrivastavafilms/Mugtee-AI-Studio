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
export function sceneToExportRequestRow(scene: SceneExportImageSource): ExportRequestSceneRow {
  return {
    id: scene.id,
    title: scene.title ?? null,
    imageUrl: resolveSceneExportImageUrl(scene) ?? null,
    imageAssetPath: resolveSceneExportAssetPath(scene) ?? null,
  }
}

export function scenesToExportRequestPayload(scenes: SceneExportImageSource[]): {
  scenes: ExportRequestSceneRow[]
  storyboards: ExportRequestSceneRow[]
} {
  const rows = scenes.filter((s) => Boolean(s?.id?.trim())).map(sceneToExportRequestRow)
  return { scenes: rows, storyboards: rows }
}

/** Prefer non-empty storyboard array; empty [] must not shadow populated scenes. */
export function pickExportStoryboardScenes<T extends SceneExportImageSource>(
  storyboard: T[] | null | undefined,
  scenes: T[]
): T[] {
  const fromStoryboard = Array.isArray(storyboard) ? storyboard.filter((s) => Boolean(s?.id?.trim())) : []
  const fromScenes = Array.isArray(scenes) ? scenes.filter((s) => Boolean(s?.id?.trim())) : []
  if (fromStoryboard.length > 0 && fromStoryboard.length >= fromScenes.length) return fromStoryboard
  if (fromScenes.length > 0) return fromScenes
  return storyboard?.length ? storyboard : scenes
}
