'use client'

import { safeExportSceneRows } from '@/lib/export/export-schema'

type ExportLogPayload = Record<string, unknown>

let activeGroup: string | null = null

function safePayload(payload: ExportLogPayload): ExportLogPayload {
  const out: ExportLogPayload = {}
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) continue
    if (typeof value === 'string' && value.startsWith('eyJ')) continue
    out[key] = value
  }
  return out
}

export function mugteeExportGroup(stage: string, payload?: ExportLogPayload): void {
  if (typeof console === 'undefined' || typeof console.group !== 'function') return
  if (activeGroup) {
    console.groupEnd()
  }
  activeGroup = stage
  console.group(`[MUGTEE EXPORT] ${stage}`)
  if (payload) {
    console.log(safePayload(payload))
  }
}

export function mugteeExportLog(stage: string, payload?: ExportLogPayload): void {
  if (typeof console === 'undefined') return
  if (payload) {
    console.log(`[MUGTEE EXPORT] ${stage}`, safePayload(payload))
  } else {
    console.log(`[MUGTEE EXPORT] ${stage}`)
  }
}

export function mugteeExportEnd(): void {
  if (typeof console === 'undefined' || typeof console.groupEnd !== 'function') return
  if (activeGroup) {
    console.groupEnd()
    activeGroup = null
  }
}

function exportSceneListCount(list: unknown[] | null | undefined): number {
  if (!Array.isArray(list) || list.length < 1) return 0
  const safe = safeExportSceneRows(list)
  return safe.length > 0 ? safe.length : list.length
}

function snapshotSceneCounts(input: {
  scenes?: unknown[] | null
  storyboards?: unknown[] | null
  payload?: unknown
}): { sceneCount: number; storyboardCount: number } {
  const sceneCount = exportSceneListCount(input.scenes)
  const storyboardCount = exportSceneListCount(input.storyboards)
  if (storyboardCount > 0 || sceneCount > 0) {
    return {
      sceneCount: sceneCount || storyboardCount,
      storyboardCount: storyboardCount || sceneCount,
    }
  }
  const payload = input.payload as { scenes?: unknown[]; storyboards?: unknown[] } | null
  const fromPayloadScenes = exportSceneListCount(payload?.scenes)
  const fromPayloadStoryboards = exportSceneListCount(payload?.storyboards)
  return {
    sceneCount: fromPayloadScenes || fromPayloadStoryboards,
    storyboardCount: fromPayloadStoryboards || fromPayloadScenes,
  }
}

export function mugteeExportSnapshot(input: {
  projectId?: string | null
  scenes?: unknown[] | null
  storyboards?: unknown[] | null
  payload?: unknown
  stage: string
}): void {
  const counts = snapshotSceneCounts(input)
  mugteeExportLog(input.stage, {
    Project: input.projectId ?? null,
    'Scenes count': counts.sceneCount,
    'Storyboards count': counts.storyboardCount,
    Payload: input.payload ?? null,
  })
}
