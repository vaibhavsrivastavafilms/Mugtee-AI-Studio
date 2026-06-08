'use client'

import type { CinematicProgressStageId } from '@/lib/quick-cut/cinematic-generation-progress'
import { DEFAULT_STAGE_DURATION_MS } from '@/lib/generation/generation-eta'

const STORAGE_KEY = 'mugtee:generation-stage-timing:v1'
const MAX_SAMPLES = 24

type TimingStore = Partial<Record<CinematicProgressStageId, number[]>>

function readStore(): TimingStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as TimingStore
  } catch {
    return {}
  }
}

function writeStore(store: TimingStore): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/** Record a completed stage duration for future ETA accuracy. */
export function recordStageDuration(stageId: CinematicProgressStageId, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 100) return
  const store = readStore()
  const samples = [...(store[stageId] ?? []), Math.round(durationMs)].slice(-MAX_SAMPLES)
  store[stageId] = samples
  writeStore(store)
}

export function averageStageDurationMs(
  stageId: CinematicProgressStageId,
  options?: { sceneCount?: number }
): number {
  const store = readStore()
  const samples = store[stageId]
  let base = samples?.length ? median(samples) : DEFAULT_STAGE_DURATION_MS[stageId]

  if (stageId === 'storyboard' && options?.sceneCount && options.sceneCount > 0) {
    const perScene = base / Math.max(4, options.sceneCount)
    base = Math.round(perScene * options.sceneCount)
  }

  return base
}

export function allStageAverages(sceneCount?: number): Record<CinematicProgressStageId, number> {
  const ids = Object.keys(DEFAULT_STAGE_DURATION_MS) as CinematicProgressStageId[]
  return Object.fromEntries(
    ids.map((id) => [id, averageStageDurationMs(id, { sceneCount })])
  ) as Record<CinematicProgressStageId, number>
}
