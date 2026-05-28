import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { breathingCadenceForScene } from '@/lib/cinematic/audio/emotional-breathing-engine'
import { buildSceneEmphasisMap } from '@/lib/cinematic/audio/scene-emphasis-mapping'
import { recallNarrationEscalation } from '@/lib/cinematic/audio/narration-escalation-memory'

export type VoicePerformancePlan = {
  direction: string
  targetWpm: number
  performanceNotes: string[]
  breathingLabel: string
}

export function buildCinematicVoicePerformance(
  output: CinematicGenerationOutput,
  voiceStyle: string,
  duration: number,
  baseWpm: number
): VoicePerformancePlan {
  const total = output.scenes.length || 1
  const emphasis = buildSceneEmphasisMap(output.scenes)
  const escalation = recallNarrationEscalation(output.scenes)
  const peakCadence = breathingCadenceForScene(
    escalation.peakSceneIndex + 1,
    total
  )

  const performanceNotes = emphasis.slice(0, 4).map((e) => `${e.label}: ${e.cue}`)
  const targetWpm = Math.round(baseWpm * peakCadence.wpmModifier)

  const direction = [
    `${voiceStyle.replace(/_/g, ' ')} — directed, human, restrained`,
    peakCadence.breathLabel,
    escalation.escalationLine,
    `Target ~${targetWpm} wpm across ${duration}s`,
  ].join('\n')

  return {
    direction,
    targetWpm,
    performanceNotes,
    breathingLabel: peakCadence.breathLabel,
  }
}
