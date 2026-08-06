/** Logical bounds — not creative minimums. */
export const PRODUCTION_DURATION_MIN_SEC = 1
export const PRODUCTION_DURATION_MAX_SEC = 180
export const PRODUCTION_DEFAULT_DURATION_SEC = 30
export const PRODUCTION_SCENE_COUNT_MIN = 1
export const PRODUCTION_SCENE_COUNT_MAX = 20

export type NormalizedProductionPlan = {
  duration: number
  sceneCount: number
  shotCount: number
  averageSceneDurationSec: number
  timelineLength: number
}

/** Scene count range [min, max] for a target duration (seconds). */
export function sceneCountRangeForDuration(durationSec: number): [number, number] {
  const d = clampProductionDuration(durationSec)
  if (d <= 10) return [1, 2]
  if (d <= 20) return [2, 4]
  if (d <= 40) return [4, 8]
  if (d <= 60) return [6, 12]
  return [8, 20]
}

export function clampProductionDuration(durationSec: number): number {
  if (!Number.isFinite(durationSec)) return PRODUCTION_DEFAULT_DURATION_SEC
  return Math.min(
    PRODUCTION_DURATION_MAX_SEC,
    Math.max(PRODUCTION_DURATION_MIN_SEC, Math.round(durationSec))
  )
}

export function clampProductionSceneCount(sceneCount: number, durationSec?: number): number {
  if (!Number.isFinite(sceneCount)) {
    return durationSec != null
      ? planSceneCountForDuration(durationSec)
      : planSceneCountForDuration(PRODUCTION_DEFAULT_DURATION_SEC)
  }
  const clamped = Math.min(
    PRODUCTION_SCENE_COUNT_MAX,
    Math.max(PRODUCTION_SCENE_COUNT_MIN, Math.round(sceneCount))
  )
  if (durationSec == null) return clamped
  const [minScenes, maxScenes] = sceneCountRangeForDuration(durationSec)
  return Math.min(maxScenes, Math.max(minScenes, clamped))
}

/** Parse duration hints from natural language (5s, 10 seconds, 2 min, etc.). */
export function inferDurationSecFromPrompt(prompt: string): number | null {
  const text = prompt.trim().toLowerCase()
  if (!text) return null

  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minute|minutes|min)\b/)
  if (minuteMatch) {
    const minutes = Number.parseFloat(minuteMatch[1] ?? '')
    if (Number.isFinite(minutes) && minutes > 0) {
      return clampProductionDuration(Math.round(minutes * 60))
    }
  }

  const secondMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|s)\b/)
  if (secondMatch) {
    const seconds = Number.parseFloat(secondMatch[1] ?? '')
    if (Number.isFinite(seconds) && seconds > 0) {
      return clampProductionDuration(Math.round(seconds))
    }
  }

  return null
}

export function planSceneCountForDuration(
  durationSec: number,
  hintedSceneCount?: number | null
): number {
  const duration = clampProductionDuration(durationSec)
  const [minScenes, maxScenes] = sceneCountRangeForDuration(duration)

  if (hintedSceneCount != null && Number.isFinite(hintedSceneCount) && hintedSceneCount > 0) {
    return clampProductionSceneCount(hintedSceneCount, duration)
  }

  if (duration <= 10) return Math.min(maxScenes, Math.max(minScenes, 2))
  if (duration <= 20) return Math.min(maxScenes, Math.max(minScenes, 3))
  if (duration <= 40) return Math.round((minScenes + maxScenes) / 2)
  return Math.ceil((minScenes + maxScenes) / 2)
}

export function planShotCountForDuration(durationSec: number, sceneCount: number): number {
  const duration = clampProductionDuration(durationSec)
  const scenes = clampProductionSceneCount(sceneCount, duration)
  const shotsPerScene = duration <= 10 ? 2 : duration <= 30 ? 2 : 2.5
  const estimated = Math.round(scenes * shotsPerScene)
  return Math.min(40, Math.max(scenes, estimated))
}

export function normalizeProductionPlanning(params: {
  prompt: string
  duration?: number | null
  sceneCount?: number | null
}): NormalizedProductionPlan {
  const inferredDuration = inferDurationSecFromPrompt(params.prompt)
  const rawDuration =
    params.duration != null && Number.isFinite(params.duration) && params.duration > 0
      ? params.duration
      : inferredDuration ?? PRODUCTION_DEFAULT_DURATION_SEC

  const duration = clampProductionDuration(rawDuration)
  const sceneCount = planSceneCountForDuration(duration, params.sceneCount)
  const shotCount = planShotCountForDuration(duration, sceneCount)

  return {
    duration,
    sceneCount,
    shotCount,
    averageSceneDurationSec: duration / sceneCount,
    timelineLength: duration,
  }
}
