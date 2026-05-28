import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'
import { cinematicSceneWeight } from '@/lib/cinematic/storyboard/cinematic-scene-weight'

export type VisualRhythmCalibration = {
  averageBeatSec: number
  driftCorrected: boolean
  rhythmLabel: string
  calibratedDurations: number[]
  longFormAdjusted: boolean
}

function longFormDurationBias(sceneIndex: number, total: number, baseBias: number): number {
  if (total < 10) return baseBias
  const role = sceneArcRole(sceneIndex, total)
  if (role === 'release') return Math.max(0.88, baseBias * 0.94)
  if (role === 'peak') return Math.min(1.2, baseBias * 1.06)
  if (role === 'tension' && sceneIndex % 4 === 0) return Math.max(0.9, baseBias * 0.97)
  return baseBias
}

function detectFlatMiddle(durations: number[], total: number): boolean {
  if (total < 8) return false
  const midStart = Math.floor(total * 0.25)
  const midEnd = Math.ceil(total * 0.75)
  const mid = durations.slice(midStart, midEnd)
  if (mid.length < 3) return false
  const avg = mid.reduce((a, b) => a + b, 0) / mid.length
  const variance =
    mid.reduce((sum, d) => sum + Math.abs(d - avg), 0) / mid.length
  return variance < 0.35
}

export function calibrateVisualRhythm(
  scenes: GeneratedScene[],
  targetDuration: number
): VisualRhythmCalibration {
  const total = scenes.length || 1
  const weights = scenes.map((_, i) => cinematicSceneWeight(i + 1, total))
  const rawTotal = scenes.reduce((sum, s) => sum + (s.duration || 0), 0) || targetDuration

  const scale = targetDuration / rawTotal
  let calibratedDurations = scenes.map((scene, i) => {
    const bias = longFormDurationBias(i + 1, total, weights[i].durationBias)
    const base = (scene.duration || targetDuration / total) * scale
    return Math.max(2, Math.round(base * bias * 10) / 10)
  })

  let longFormAdjusted = false
  if (detectFlatMiddle(calibratedDurations, total)) {
    longFormAdjusted = true
    calibratedDurations = calibratedDurations.map((dur, i) => {
      const role = sceneArcRole(i + 1, total)
      if (role === 'release') return Math.max(2, Math.round(dur * 1.08 * 10) / 10)
      if (role === 'peak') return Math.max(2, Math.round(dur * 1.05 * 10) / 10)
      if (role === 'tension' && i % 3 === 0) return Math.max(2, Math.round(dur * 0.96 * 10) / 10)
      return dur
    })
  }

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
  const rhythmLabel =
    total >= 10 && longFormAdjusted
      ? 'Long-form arc — breathing beats prevent flattening'
      : hasPeak
        ? 'Film-aware escalation — peak held longer'
        : 'Lyrical restraint — even beat spacing'

  return {
    averageBeatSec,
    driftCorrected,
    rhythmLabel,
    calibratedDurations,
    longFormAdjusted,
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
