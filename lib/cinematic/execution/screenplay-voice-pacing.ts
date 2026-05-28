import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { breathingCadenceForScene } from '@/lib/cinematic/audio/emotional-breathing-engine'
import { recallNarrationEscalation } from '@/lib/cinematic/audio/narration-escalation-memory'
import { translateScreenplayToFilmPlan } from '@/lib/cinematic/execution/screenplay-video-translator'

export function paceNarrationForFilm(
  script: string,
  output: CinematicGenerationOutput
): { text: string; targetWpm: number; maxChars: number } {
  const plan = translateScreenplayToFilmPlan(output)
  const targetWpm = plan.voicePacingWpm
  const maxChars = Math.round((plan.totalDuration / 60) * targetWpm * 5.5)
  let text = script.trim()

  if (text.length > maxChars) {
    text = text.slice(0, maxChars).replace(/\s+\S*$/, '…')
  }

  return { text, targetWpm, maxChars }
}

export function voiceDirectionNote(
  voiceStyle: string,
  duration: number,
  sceneCount = 0
): string {
  const pace =
    duration <= 30 ? 'tight, lyrical restraint' : duration <= 60 ? 'documentary breath' : 'unhurried cinematic cadence'
  const escalation =
    sceneCount > 0
      ? recallNarrationEscalation(
          Array.from({ length: sceneCount }, (_, i) => ({
            id: String(i),
            title: '',
            description: '',
            duration: duration / sceneCount,
            visualPrompt: '',
            cameraAngle: '',
            lightingMood: '',
            environment: '',
            colorPalette: '',
            movementStyle: '',
          }))
        ).escalationLine
      : ''
  const breath =
    sceneCount > 0
      ? breathingCadenceForScene(Math.min(2, sceneCount), sceneCount).breathLabel
      : 'natural cinematic cadence'
  return [
    `${voiceStyle.replace(/_/g, ' ')} · ${pace} · human, not broadcast`,
    breath,
    escalation,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function dialogueFlowSegments(output: CinematicGenerationOutput): string[] {
  return output.scenes.map((s, i) => `[${i + 1}] ${s.description.slice(0, 220)}`)
}
