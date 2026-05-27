import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
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
  duration: number
): string {
  const pace =
    duration <= 30 ? 'tight, lyrical restraint' : duration <= 60 ? 'documentary breath' : 'unhurried cinematic cadence'
  return `${voiceStyle.replace(/_/g, ' ')} · ${pace} · no announcer energy`
}

export function dialogueFlowSegments(output: CinematicGenerationOutput): string[] {
  return output.scenes.map((s, i) => `[${i + 1}] ${s.description.slice(0, 220)}`)
}
