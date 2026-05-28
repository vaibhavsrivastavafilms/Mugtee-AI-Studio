import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import { breathingCadenceForScene } from '@/lib/cinematic/audio/emotional-breathing-engine'
import { recallNarrationEscalation } from '@/lib/cinematic/audio/narration-escalation-memory'

export type NarrationSyncPoint = {
  sceneIndex: number
  startMs: number
  endMs: number
  pauseBeforeMs: number
  pauseAfterMs: number
  breathLabel: string
  beatAligned: boolean
}

export type NarrationSyncTimeline = {
  syncPoints: NarrationSyncPoint[]
  soundtrackCueMs: number[]
  silencePacingMs: number
  peakSceneIndex: number
  actBreathIndices: number[]
}

export function buildNarrationSyncTimeline(
  blueprint: CinematicRenderBlueprint
): NarrationSyncTimeline {
  const total = blueprint.shots.length || 1
  const escalation = recallNarrationEscalation(
    blueprint.shots.map((shot, i) => ({
      id: String(shot.sceneIndex),
      title: blueprint.sequence[i]?.narrationCue?.slice(0, 40) ?? `Beat ${i + 1}`,
      description: blueprint.sequence[i]?.narrationCue ?? '',
      duration: shot.durationSec,
      visualPrompt: shot.visualPrompt,
      cameraAngle: shot.cameraMotion,
      lightingMood: shot.lighting,
      environment: '',
      colorPalette: shot.palette,
      movementStyle: blueprint.motionDirections[i] ?? '',
    }))
  )

  let cursorMs = 0
  const syncPoints: NarrationSyncPoint[] = blueprint.shots.map((shot, i) => {
    const cadence = breathingCadenceForScene(i + 1, total)
    const durationMs = shot.durationSec * 1000
    const startMs = cursorMs + cadence.pauseBeforeMs
    const endMs = startMs + durationMs - cadence.pauseBeforeMs - cadence.pauseAfterMs
    cursorMs += durationMs

    const beat = blueprint.sequence[i]
    const beatAligned =
      beat?.emotionalWeight === 'peak'
        ? i === escalation.peakSceneIndex
        : beat?.emotionalWeight !== 'open' || i === 0

    return {
      sceneIndex: shot.sceneIndex,
      startMs,
      endMs: Math.max(startMs + 400, endMs),
      pauseBeforeMs: cadence.pauseBeforeMs,
      pauseAfterMs: cadence.pauseAfterMs,
      breathLabel: cadence.breathLabel,
      beatAligned,
    }
  })

  const soundtrackCueMs = syncPoints
    .filter((_, i) => blueprint.sequence[i]?.emotionalWeight === 'peak')
    .map((p) => p.startMs)

  const avgBreath =
    syncPoints.reduce((sum, p) => sum + p.pauseAfterMs, 0) / Math.max(syncPoints.length, 1)
  const silencePacingMs = Math.round(avgBreath * (total >= 10 ? 1.12 : 1))

  return {
    syncPoints,
    soundtrackCueMs:
      soundtrackCueMs.length > 0
        ? soundtrackCueMs
        : [syncPoints[Math.min(escalation.peakSceneIndex, syncPoints.length - 1)]?.startMs ?? 0],
    silencePacingMs,
    peakSceneIndex: escalation.peakSceneIndex,
    actBreathIndices: escalation.actBreaks,
  }
}
