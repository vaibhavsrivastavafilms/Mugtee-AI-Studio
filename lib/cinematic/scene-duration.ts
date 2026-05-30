import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'

const DEFAULT_MIN_SCENE_SEC = 2
const DEFAULT_FALLBACK_SCENE_SEC = 4

export function sumSceneDurationSec(
  scenes: Array<{ duration?: number | null }>,
  fallback = DEFAULT_FALLBACK_SCENE_SEC,
  minSec = DEFAULT_MIN_SCENE_SEC
): number {
  return scenes.reduce((sum, s) => sum + Math.max(minSec, s.duration ?? fallback), 0)
}

/** Scale per-scene durations so their sum does not exceed targetTotalSec (max 60s). */
export function clampSceneDurationsToTarget<T extends { duration?: number | null }>(
  scenes: T[],
  targetTotalSec: number,
  opts?: {
    minSec?: number
    fallback?: number
    maxPerScene?: number
  }
): Array<T & { duration: number }> {
  const minSec = opts?.minSec ?? DEFAULT_MIN_SCENE_SEC
  const fallback = opts?.fallback ?? DEFAULT_FALLBACK_SCENE_SEC
  const maxPerScene = opts?.maxPerScene ?? 8
  const cappedTarget = Math.min(
    Math.max(targetTotalSec, minSec),
    MAX_VIDEO_DURATION_SEC
  )

  if (scenes.length === 0) return []

  const raw = scenes.map((s) =>
    Math.min(maxPerScene, Math.max(minSec, s.duration ?? fallback))
  )
  const rawTotal = raw.reduce((a, b) => a + b, 0)

  if (rawTotal <= cappedTarget) {
    return scenes.map((s, i) => ({ ...s, duration: raw[i]! }))
  }

  const scale = cappedTarget / rawTotal
  const scaled = raw.map((d) => Math.max(minSec, d * scale))
  const headSum = scaled.slice(0, -1).reduce((a, b) => a + b, 0)
  scaled[scaled.length - 1] = Math.max(minSec, cappedTarget - headSum)

  return scenes.map((s, i) => ({
    ...s,
    duration: Math.round(scaled[i]! * 100) / 100,
  }))
}

export function computeRenderTotalSec(
  scenes: Array<{ duration?: number | null }>,
  explicitTarget?: number
): number {
  if (explicitTarget != null && Number.isFinite(explicitTarget)) {
    return Math.min(
      MAX_VIDEO_DURATION_SEC,
      Math.max(DEFAULT_MIN_SCENE_SEC, explicitTarget)
    )
  }
  return Math.min(MAX_VIDEO_DURATION_SEC, sumSceneDurationSec(scenes))
}

/** Trim narration text to a rough spoken-length budget (~14 chars/sec). */
export function trimNarrationForMaxDuration(
  text: string,
  maxSec = MAX_VIDEO_DURATION_SEC
): string {
  const maxChars = maxSec * 14
  return text.slice(0, maxChars).trim()
}
