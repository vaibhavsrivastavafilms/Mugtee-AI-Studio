import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildNarrationFromScript } from '@/lib/ai/synthesize-speech'

export type WordTiming = {
  text: string
  startSec: number
  endSec: number
}

export type SceneCaptionPlan = {
  sceneIndex: number
  text: string
  startSec: number
  endSec: number
  words: WordTiming[]
}

/** Rough syllable count for weighting word duration. */
export function estimateSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 1
  const vowelGroups = w.match(/[aeiouy]+/g)
  let count = vowelGroups?.length ?? 1
  if (w.endsWith('e') && count > 1) count -= 1
  if (w.endsWith('le') && w.length > 2 && !/[aeiouy]/.test(w[w.length - 3] ?? '')) {
    count += 1
  }
  return Math.max(1, count)
}

export function tokenizeWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/** Spread words across [startSec, endSec] weighted by syllable count. */
export function buildWordTimings(
  text: string,
  startSec: number,
  endSec: number
): WordTiming[] {
  const tokens = tokenizeWords(text)
  if (tokens.length === 0) return []

  const duration = Math.max(0.05, endSec - startSec)
  const weights = tokens.map(estimateSyllables)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || tokens.length
  let cursor = startSec

  return tokens.map((token, i) => {
    const wordDur = (weights[i] / totalWeight) * duration
    const timing: WordTiming = {
      text: token,
      startSec: cursor,
      endSec: cursor + wordDur,
    }
    cursor += wordDur
    return timing
  })
}

export function narrationFromScenes(scenes: GeneratedScene[], fallback = ''): string {
  const fromScenes = scenes
    .map((s) => s.description?.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
  return fromScenes || fallback.replace(/\s+/g, ' ').trim()
}

/** Per-scene caption windows scaled to total audio duration. */
export function buildSceneCaptionPlan(
  scenes: GeneratedScene[],
  totalDurationSec: number,
  fallbackText = ''
): SceneCaptionPlan[] {
  const usable = scenes
    .map((scene, sceneIndex) => ({ scene, sceneIndex }))
    .filter(({ scene }) => Boolean(scene.description?.trim()))

  if (usable.length === 0) {
    const text = fallbackText.trim()
    if (!text || totalDurationSec <= 0) return []
    return [
      {
        sceneIndex: 0,
        text,
        startSec: 0,
        endSec: totalDurationSec,
        words: buildWordTimings(text, 0, totalDurationSec),
      },
    ]
  }

  const rawTotal = usable.reduce(
    (sum, { scene }) => sum + Math.max(2, scene.duration || 4),
    0
  )
  const scale = totalDurationSec / rawTotal
  let cursor = 0
  const plan: SceneCaptionPlan[] = []

  for (const { scene, sceneIndex } of usable) {
    const dur = Math.max(2, (scene.duration || 4) * scale)
    const startSec = cursor
    const endSec = Math.min(cursor + dur, totalDurationSec)
    const text = scene.description.replace(/\s+/g, ' ').trim()
    plan.push({
      sceneIndex,
      text,
      startSec,
      endSec,
      words: buildWordTimings(text, startSec, endSec),
    })
    cursor += dur
  }

  return plan
}

/** Full narration word timings for voice-tab preview (single continuous track). */
export function buildFullNarrationTimings(
  script: string,
  scenes: GeneratedScene[],
  totalDurationSec: number,
  fallbackText = ''
): WordTiming[] {
  const narration =
    narrationFromScenes(scenes, '') ||
    buildNarrationFromScript(script) ||
    fallbackText.trim()
  if (!narration || totalDurationSec <= 0) return []
  return buildWordTimings(narration, 0, totalDurationSec)
}

export function getActiveWordIndex(words: WordTiming[], currentTimeSec: number): number {
  if (words.length === 0 || currentTimeSec < words[0].startSec) return -1
  for (let i = words.length - 1; i >= 0; i--) {
    if (currentTimeSec >= words[i].startSec) return i
  }
  return -1
}

export function getCaptionAtTime(
  plan: SceneCaptionPlan[],
  currentTimeSec: number
): { words: WordTiming[]; activeIndex: number; sceneIndex: number } | null {
  if (plan.length === 0) return null

  const scene =
    plan.find((s) => currentTimeSec >= s.startSec && currentTimeSec < s.endSec) ??
    plan[plan.length - 1]

  return {
    words: scene.words,
    activeIndex: getActiveWordIndex(scene.words, currentTimeSec),
    sceneIndex: scene.sceneIndex,
  }
}
