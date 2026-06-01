import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneVoiceDirection } from '@/lib/voice/voiceDirector'
import type { ReelVoiceSegment } from '@/lib/reel/types'
import { narrationFromScenes } from '@/lib/cinematic/captions/word-timing'
import { buildNarrationFromScript } from '@/lib/ai/synthesize-speech'
import { scaleDurationsToVoiceTotal } from '@/lib/reel/scene-timing'

function sceneNarrationText(scene: GeneratedScene): string {
  return (scene.description || scene.visualPrompt || scene.title || '').replace(/\s+/g, ' ').trim()
}

function wordWeight(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return Math.max(1, words.length)
}

/** Estimate voice track length when ElevenLabs metadata is unavailable. */
export function estimateVoiceDurationSec(
  scenes: GeneratedScene[],
  script?: string
): number {
  const narration =
    narrationFromScenes(scenes, '') || buildNarrationFromScript(script ?? '')
  return Math.max(15, Math.round(narration.length / 14))
}

export function estimateVoiceTotalSec(
  voiceDurationSec?: number | null,
  narration?: string
): number {
  if (voiceDurationSec != null && Number.isFinite(voiceDurationSec) && voiceDurationSec > 0) {
    return voiceDurationSec
  }
  const text = narration?.trim() ?? ''
  return Math.max(15, Math.round(text.length / 14))
}

/** Per-scene durations scaled to ElevenLabs voice total. */
export function sceneDurationsFromVoiceMetadata(
  scenes: GeneratedScene[],
  voiceTotalSec: number,
  rawDurations: number[]
): number[] {
  return scaleDurationsToVoiceTotal(rawDurations, voiceTotalSec)
}

/** Voice segments aligned to per-scene durations (scene duration = narration window). */
export function buildVoiceSegmentsForScenes(
  scenes: GeneratedScene[],
  sceneDurations: number[],
  voiceTotalSec: number,
  options?: {
    script?: string
    sceneDirections?: SceneVoiceDirection[]
  }
): ReelVoiceSegment[] {
  if (scenes.length === 0) return []

  const fullNarration =
    narrationFromScenes(scenes, '') ||
    buildNarrationFromScript(options?.script ?? '') ||
    scenes.map(sceneNarrationText).filter(Boolean).join(' ')

  const texts = scenes.map(sceneNarrationText)
  let cursor = 0
  const segments: ReelVoiceSegment[] = []

  for (let i = 0; i < scenes.length; i++) {
    const durationSec = sceneDurations[i] ?? voiceTotalSec / scenes.length
    const startSec = cursor
    const endSec = startSec + durationSec
    const text = texts[i] || fullNarration.slice(0, 80)

    segments.push({
      text,
      startSec,
      endSec,
      audioOffsetSec: startSec,
      durationSec: Math.max(0.05, durationSec),
    })
    cursor = endSec
  }

  return segments
}
