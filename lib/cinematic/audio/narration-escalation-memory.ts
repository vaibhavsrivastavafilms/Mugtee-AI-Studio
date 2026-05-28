import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import { dominantSceneIndex } from '@/lib/cinematic/storyboard/cinematic-scene-weight'

export type NarrationEscalationMemory = {
  peakSceneIndex: number
  escalationLine: string
  priorIntensity: number[]
  releaseIndex: number
}

export function recallNarrationEscalation(
  scenes: GeneratedScene[]
): NarrationEscalationMemory {
  const total = scenes.length || 1
  const roles = scenes.map((_, i) => scenePacingRole(i + 1, total))
  const peakSceneIndex = roles.indexOf('peak') >= 0 ? roles.indexOf('peak') : dominantSceneIndex(scenes)
  const releaseIndex = roles.lastIndexOf('release')

  const priorIntensity = roles.slice(0, peakSceneIndex + 1).map((role) => {
    if (role === 'hook') return 0.4
    if (role === 'tension') return 0.65
    if (role === 'peak') return 1
    return 0.5
  })

  const escalationLine =
    peakSceneIndex >= 0
      ? `Narration crests at beat ${peakSceneIndex + 1} — then exhales`
      : 'Even cadence — lyrical restraint held throughout'

  return {
    peakSceneIndex,
    escalationLine,
    priorIntensity,
    releaseIndex: releaseIndex >= 0 ? releaseIndex : total - 1,
  }
}
