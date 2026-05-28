import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { buildCinematicVoicePerformance } from '@/lib/cinematic/audio/cinematic-voice-performance'
import {
  dialogueFlowSegments,
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
  const performance = buildCinematicVoicePerformance(
    output,
    voiceStyle,
    duration,
    paced.targetWpm
  )
  const flow = dialogueFlowSegments(output).slice(0, 4)
  const direction = [
    performance.direction,
    voiceDirectionNote(voiceStyle, duration),
    flow.length >= 2 ? `Beat flow: ${flow.join(' → ')}` : '',
    performance.performanceNotes.length
      ? `Emphasis: ${performance.performanceNotes.join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  return {
    narration: paced.text,
    direction,
    targetWpm: performance.targetWpm,
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
