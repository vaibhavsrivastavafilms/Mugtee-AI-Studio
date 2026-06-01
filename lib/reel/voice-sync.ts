import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { ReelVoiceSegment } from '@/lib/reel/types'

function sceneNarration(scene: GeneratedScene): string {
  return (scene.description || scene.visualPrompt || scene.title || '').replace(/\s+/g, ' ').trim()
}

function narrationWeights(scenes: GeneratedScene[]): number[] {
  return scenes.map((s) => Math.max(1, sceneNarration(s).split(/\s+/).filter(Boolean).length))
}

/** Split full narration into per-scene voice segments aligned to scene windows. */
export function buildVoiceSegmentsForScenes(
  scenes: GeneratedScene[],
  sceneDurations: number[],
  voiceTotalSec?: number
): ReelVoiceSegment[] {
  const total =
    voiceTotalSec && voiceTotalSec > 0
      ? voiceTotalSec
      : sceneDurations.reduce((a, b) => a + b, 0)

  let cursor = 0
  let audioOffset = 0
  const segments: ReelVoiceSegment[] = []

  for (let i = 0; i < scenes.length; i++) {
    const dur = sceneDurations[i] ?? 4
    const text = sceneNarration(scenes[i]!)
    const startSec = cursor
    const endSec = Math.min(cursor + dur, total)
    segments.push({
      text,
      startSec,
      endSec,
      audioOffsetSec: audioOffset,
      durationSec: Math.max(0.05, endSec - startSec),
    })
    cursor = endSec
    audioOffset += Math.max(0.05, endSec - startSec)
  }

  return segments
}

/** Estimate voice duration when ElevenLabs metadata is unavailable (~14 chars/sec). */
export function estimateVoiceDurationSec(scenes: GeneratedScene[], fallbackScript?: string): number {
  const fromScenes = scenes.map(sceneNarration).filter(Boolean).join(' ')
  const text = fromScenes || (fallbackScript ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return 30
  return Math.max(15, Math.min(60, Math.round(text.length / 14)))
}

/** Proportional scene durations from voice metadata duration. */
export function sceneDurationsFromVoiceMetadata(
  scenes: GeneratedScene[],
  voiceDurationSec: number,
  rawDurations: number[]
): number[] {
  const weights = narrationWeights(scenes)
  const weightTotal = weights.reduce((a, b) => a + b, 0) || scenes.length
  const minSec = 2

  const proportional = weights.map((w, i) => {
    const share = (w / weightTotal) * voiceDurationSec
    const emotionBoost = rawDurations[i] ?? 4
    return Math.max(minSec, share * 0.7 + emotionBoost * 0.3)
  })

  const sum = proportional.reduce((a, b) => a + b, 0)
  const scale = voiceDurationSec / sum
  const scaled = proportional.map((d) => Math.max(minSec, d * scale))
  const head = scaled.slice(0, -1).reduce((a, b) => a + b, 0)
  scaled[scaled.length - 1] = Math.max(minSec, voiceDurationSec - head)
  return scaled.map((d) => Math.round(d * 100) / 100)
}
