import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import {
  paceNarrationForFilm,
  voiceDirectionNote,
} from '@/lib/cinematic/execution/screenplay-voice-pacing'

export function prepareCinematicVoiceover(
  script: string,
  output: CinematicGenerationOutput,
  voiceStyle: string,
  duration: number
): {
  narration: string
  direction: string
  targetWpm: number
} {
  const paced = paceNarrationForFilm(script, output)
  return {
    narration: paced.text,
    direction: voiceDirectionNote(voiceStyle, duration),
    targetWpm: paced.targetWpm,
  }
}

export function emotionalNarrationSystemPrompt(
  voiceStyle: string,
  direction: string,
  targetWpm: number
): string {
  return [
    'Rewrite as cinematic narration only — one continuous voiceover paragraph.',
    'No scene labels, no bullet lists, no host intros.',
    direction,
    `Target ~${targetWpm} words per minute. Emotionally directed, film-grade, restrained.`,
    `Voice style: ${voiceStyle.replace(/_/g, ' ')}.`,
  ].join(' ')
}
