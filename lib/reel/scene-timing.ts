import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'

const MIN_SCENE_SEC = 2
const MAX_SCENE_SEC = 12
const DEFAULT_SCENE_SEC = 4

/** Emotional pacing multipliers — suspense holds longer, action cuts faster. */
const EMOTION_DURATION_FACTOR: Record<string, number> = {
  suspense: 1.28,
  tension: 1.18,
  mystery: 1.22,
  documentary: 1.05,
  cinematic: 1,
  emotional: 1.12,
  luxury: 1.08,
  action: 0.82,
  motivation: 0.88,
  hook: 0.92,
}

const ROLE_DURATION_FACTOR: Record<string, number> = {
  hook: 0.9,
  tension: 1.05,
  peak: 1.15,
  aftertaste: 1.2,
  bridge: 1,
  release: 0.95,
}

function narrationWeight(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, words)
}

function emotionFactor(emotion?: string): number {
  if (!emotion?.trim()) return 1
  const key = emotion.toLowerCase()
  for (const [k, v] of Object.entries(EMOTION_DURATION_FACTOR)) {
    if (key.includes(k)) return v
  }
  return 1
}

/** Scene duration from narration length, emotional pacing, and script intensity. */
export function computeSceneDurationSec(
  scene: GeneratedScene,
  index: number,
  total: number,
  blueprint?: SceneBlueprint | null,
  opts?: { minSec?: number; maxSec?: number }
): number {
  const minSec = opts?.minSec ?? MIN_SCENE_SEC
  const maxSec = opts?.maxSec ?? MAX_SCENE_SEC
  const role = scenePacingRole(index + 1, total)
  const narration = (scene.description || scene.visualPrompt || scene.title || '').trim()
  const weight = narrationWeight(narration)
  const emotion = blueprint?.emotion || inferIntensityEmotion(narration)
  const base = scene.duration && scene.duration > 0 ? scene.duration : DEFAULT_SCENE_SEC
  const wordScaled = Math.max(minSec, Math.min(maxSec, weight * 0.38 + 1.8))
  const blended = base * 0.35 + wordScaled * 0.65
  const factor = emotionFactor(emotion) * (ROLE_DURATION_FACTOR[role] ?? 1)
  return Math.round(Math.max(minSec, Math.min(maxSec, blended * factor)) * 100) / 100
}

function inferIntensityEmotion(text: string): string {
  const blob = text.toLowerCase()
  if (/\b(suspense|secret|hidden|mystery|dread)\b/.test(blob)) return 'suspense'
  if (/\b(chase|run|fight|battle|crash)\b/.test(blob)) return 'action'
  if (/\b(documentary|archive|testimony)\b/.test(blob)) return 'documentary'
  if (/\b(never|always|finally|truth|power)\b/.test(blob)) return 'motivation'
  return 'cinematic'
}

/** Scale raw scene durations to match voice track length. */
export function scaleDurationsToVoiceTotal(
  rawDurations: number[],
  voiceTotalSec: number,
  minSec = MIN_SCENE_SEC
): number[] {
  if (rawDurations.length === 0) return []
  const rawTotal = rawDurations.reduce((a, b) => a + b, 0)
  if (rawTotal <= 0 || voiceTotalSec <= 0) return rawDurations

  const scale = voiceTotalSec / rawTotal
  const scaled = rawDurations.map((d) => Math.max(minSec, d * scale))
  const head = scaled.slice(0, -1).reduce((a, b) => a + b, 0)
  scaled[scaled.length - 1] = Math.max(minSec, voiceTotalSec - head)
  return scaled.map((d) => Math.round(d * 100) / 100)
}
