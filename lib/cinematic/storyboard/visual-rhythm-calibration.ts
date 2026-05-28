import type { GeneratedScene } from '@/lib/cinematic/generation'
import { cinematicSceneWeight } from '@/lib/cinematic/storyboard/cinematic-scene-weight'

export type VisualRhythmCalibration = {
  averageBeatSec: number
  driftCorrected: boolean
  rhythmLabel: string
  calibratedDurations: number[]
}

export function calibrateVisualRhythm(
  scenes: GeneratedScene[],
  targetDuration: number
): VisualRhythmCalibration {
  const total = scenes.length || 1
  const weights = scenes.map((_, i) => cinematicSceneWeight(i + 1, total))
  const rawTotal = scenes.reduce((sum, s) => sum + (s.duration || 0), 0) || targetDuration

  const scale = targetDuration / rawTotal
  const calibratedDurations = scenes.map((scene, i) => {
    const base = (scene.duration || targetDuration / total) * scale
    return Math.max(2, Math.round(base * weights[i].durationBias * 10) / 10)
  })

  const sum = calibratedDurations.reduce((a, b) => a + b, 0)
  const driftCorrected = Math.abs(sum - targetDuration) > 1.5

  if (driftCorrected && calibratedDurations.length > 0) {
    const adjust = (targetDuration - sum) / calibratedDurations.length
    for (let i = 0; i < calibratedDurations.length; i++) {
      calibratedDurations[i] = Math.max(2, Math.round((calibratedDurations[i] + adjust) * 10) / 10)
    }
  }

  const averageBeatSec = calibratedDurations.length
    ? calibratedDurations.reduce((a, b) => a + b, 0) / calibratedDurations.length
    : targetDuration

  const hasPeak = weights.some((w) => w.role === 'peak')
  const rhythmLabel = hasPeak
    ? 'Film-aware escalation — peak held longer'
    : 'Lyrical restraint — even beat spacing'

  return {
    averageBeatSec,
    driftCorrected,
    rhythmLabel,
    calibratedDurations,
  }
}

export function applyCalibratedDurations(
  scenes: GeneratedScene[],
  calibration: VisualRhythmCalibration
): GeneratedScene[] {
  return scenes.map((scene, i) => ({
    ...scene,
    duration: calibration.calibratedDurations[i] ?? scene.duration,
  }))
}
