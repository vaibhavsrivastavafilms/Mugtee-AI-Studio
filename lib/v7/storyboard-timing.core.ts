import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'

export function resolveStoryboardShotTimingSeconds(value: unknown, fallbackSec: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  const fallback = Number.isFinite(fallbackSec) && fallbackSec > 0 ? fallbackSec : 1
  return Math.max(1, Math.round(fallback * 10) / 10)
}

export function normalizeStoryboardTiming(raw: unknown, script: V7ScriptDocument): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw

  const root = raw as Record<string, unknown>
  if (!Array.isArray(root.scenes)) return raw

  return {
    ...root,
    scenes: root.scenes.map((sceneRaw, sceneIndex) => {
      if (!sceneRaw || typeof sceneRaw !== 'object' || Array.isArray(sceneRaw)) return sceneRaw

      const scene = sceneRaw as Record<string, unknown>
      const sceneNumber = Number(scene.number)
      const scriptScene =
        script.scenes.find((row) => row.number === sceneNumber) ?? script.scenes[sceneIndex]
      const sceneDuration = scriptScene?.duration ?? 5
      const shots = Array.isArray(scene.shots) ? scene.shots : []
      const perShotFallback = shots.length > 0 ? sceneDuration / shots.length : sceneDuration

      return {
        ...scene,
        shots: shots.map((shotRaw) => {
          if (!shotRaw || typeof shotRaw !== 'object' || Array.isArray(shotRaw)) return shotRaw

          const shot = shotRaw as Record<string, unknown>
          return {
            ...shot,
            timing: resolveStoryboardShotTimingSeconds(shot.timing, perShotFallback),
          }
        }),
      }
    }),
  }
}
