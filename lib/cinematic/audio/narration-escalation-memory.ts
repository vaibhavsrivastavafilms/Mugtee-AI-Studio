import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'
import { dominantSceneIndex } from '@/lib/cinematic/storyboard/cinematic-scene-weight'

export type NarrationEscalationMemory = {
  peakSceneIndex: number
  escalationLine: string
  priorIntensity: number[]
  releaseIndex: number
  actBreaks: number[]
}

function intensityForRole(role: string): number {
  if (role === 'hook') return 0.4
  if (role === 'tension') return 0.65
  if (role === 'peak') return 1
  if (role === 'release') return 0.45
  return 0.5
}

export function recallNarrationEscalation(
  scenes: GeneratedScene[]
): NarrationEscalationMemory {
  const total = scenes.length || 1
  const roles = scenes.map((_, i) => sceneArcRole(i + 1, total))
  const peakIndices = roles
    .map((role, i) => (role === 'peak' ? i : -1))
    .filter((i) => i >= 0)
  const peakSceneIndex =
    peakIndices.length > 0
      ? peakIndices[Math.floor(peakIndices.length / 2)]
      : dominantSceneIndex(scenes)
  const releaseIndex = roles.lastIndexOf('release')

  const priorIntensity = roles.slice(0, peakSceneIndex + 1).map(intensityForRole)

  const actBreaks =
    total >= 10
      ? roles
          .map((role, i) => (role === 'release' && i > 0 && i < total - 1 ? i : -1))
          .filter((i) => i >= 0)
      : []

  const antiFatigueWave = total >= 20 ? Math.floor(total / 8) : 0
  const waveNote =
    antiFatigueWave > 0
      ? ` · ${antiFatigueWave} cadence waves prevent voice fatigue`
      : ''

  const escalationLines =
    total >= 20
      ? [
          `Extended voice arc — ${total} beats with ${actBreaks.length} breathing pauses${waveNote}`,
          `Long-form narration — crest at beat ${peakSceneIndex + 1}, variation held throughout`,
        ]
      : total >= 10
      ? [
          `Long-form voice arc — crest at beat ${peakSceneIndex + 1}, ${actBreaks.length} breathing pauses`,
          `Narration waves across ${total} beats — peak held at ${peakSceneIndex + 1}`,
        ]
      : [
          peakSceneIndex >= 0
            ? `Voice crests at beat ${peakSceneIndex + 1} — then exhales`
            : 'Even cadence — lyrical restraint throughout',
          peakSceneIndex >= 0
            ? `Narration gathers toward beat ${peakSceneIndex + 1}`
            : 'Held breath — documentary restraint',
        ]
  const escalationLine = escalationLines[total % escalationLines.length]

  return {
    peakSceneIndex,
    escalationLine,
    priorIntensity,
    releaseIndex: releaseIndex >= 0 ? releaseIndex : total - 1,
    actBreaks,
  }
}
