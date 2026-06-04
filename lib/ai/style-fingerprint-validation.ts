import type { CreatorStyleFingerprint } from '@/lib/ai/style-fingerprint'

export const STYLE_CONSISTENCY_THRESHOLD = 70

export type StyleConsistencyStep =
  | 'hook'
  | 'script'
  | 'caption'
  | 'title'
  | 'visual'
  | 'storyboard'

const HIGH_INTENSITY_WORDS =
  /\b(never|always|raw|truth|break|shatter|finally|secret|real reason|you don't)\b/i
const SUBTLE_WORDS = /\b(quiet|gentle|maybe|perhaps|stillness|notice|soft)\b/i
const FAST_PACING_MARKERS = /\b(now|cut|snap|fast|instant|watch)\b/i
const SLOW_PACING_MARKERS = /\b(slow|breathe|hold|silence|linger|still)\b/i
const BANNED_DRIFT = /\b(grindset|you got this|game changer|passive income|manifest)\b/i

function sentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function avgWordsPerSentence(text: string): number {
  const sents = sentences(text)
  if (!sents.length) return 0
  const words = sents.flatMap((s) => s.split(/\s+/).filter(Boolean))
  return words.length / sents.length
}

function wordLengthVariance(text: string): number {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 3) return 0
  const lengths = words.map((w) => w.length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance =
    lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length
  return Math.sqrt(variance)
}

function scoreRhythm(text: string, rhythm: CreatorStyleFingerprint['sentenceRhythm']): number {
  const avg = avgWordsPerSentence(text)
  const variance = wordLengthVariance(text)
  if (avg === 0) return 40

  if (rhythm === 'staccato') {
    if (avg <= 12) return 90
    if (avg <= 16) return 70
    return 45
  }
  if (rhythm === 'flowing') {
    if (avg >= 14 && variance >= 2.5) return 88
    if (avg >= 10) return 72
    return 50
  }
  if (avg >= 8 && avg <= 18 && variance >= 2) return 85
  if (avg <= 22) return 65
  return 48
}

function scoreIntensity(
  text: string,
  intensity: CreatorStyleFingerprint['emotionalIntensity']
): number {
  const high = (text.match(HIGH_INTENSITY_WORDS) ?? []).length
  const subtle = (text.match(SUBTLE_WORDS) ?? []).length

  if (intensity === 'high-impact') {
    if (high >= 2) return 90
    if (high >= 1) return 75
    return 50
  }
  if (intensity === 'subtle') {
    if (subtle >= 1 && high === 0) return 88
    if (high <= 1) return 72
    return 45
  }
  if (high >= 1 || subtle >= 1) return 82
  return 60
}

function scorePacing(text: string, pacing: CreatorStyleFingerprint['pacing']): number {
  const fast = (text.match(FAST_PACING_MARKERS) ?? []).length
  const slow = (text.match(SLOW_PACING_MARKERS) ?? []).length
  const avg = avgWordsPerSentence(text)

  if (pacing === 'fast-cut') {
    if (avg <= 14 || fast >= 1) return 85
    return 55
  }
  if (pacing === 'slow-burn') {
    if (avg >= 12 || slow >= 1) return 85
    return 55
  }
  if (avg >= 8 && avg <= 20) return 80
  return 62
}

function scoreHookStyle(text: string, hookStyle: CreatorStyleFingerprint['hookStyle']): number {
  const t = text.trim()
  if (t.length < 8) return 30
  if (hookStyle === 'curiosity-gap' && /\?|why|what if|nobody|most people/i.test(t)) return 88
  if (hookStyle === 'identity-challenge' && /\byou\b|your\b|who you/i.test(t)) return 86
  if (hookStyle === 'observational' && /\b(the|this|when|while)\b/i.test(t)) return 82
  if (hookStyle === 'reveal' && /\b(real|actually|truth|pattern)\b/i.test(t)) return 84
  return 65
}

function extractComparableText(output: string | Record<string, unknown>): string {
  if (typeof output === 'string') return output
  const parts: string[] = []
  for (const key of ['hook', 'script', 'caption', 'title', 'text', 'summary', 'cta']) {
    const v = output[key]
    if (typeof v === 'string' && v.trim()) parts.push(v.trim())
  }
  if (Array.isArray(output.scenes)) {
    for (const scene of output.scenes) {
      if (scene && typeof scene === 'object') {
        const row = scene as Record<string, unknown>
        for (const k of ['description', 'voiceover', 'visual', 'narration']) {
          const line = row[k]
          if (typeof line === 'string') parts.push(line)
        }
      }
    }
  }
  return parts.join('\n')
}

/**
 * Heuristic 0–100 consistency score vs creator style fingerprint.
 * No ML — keyword, length, and pacing markers only.
 */
export function scoreOutputConsistency(
  output: string | Record<string, unknown>,
  fingerprint: CreatorStyleFingerprint,
  step: StyleConsistencyStep
): number {
  const text = extractComparableText(output).trim()
  if (!text) return 0

  if (BANNED_DRIFT.test(text)) return 25

  const rhythmScore = scoreRhythm(text, fingerprint.sentenceRhythm)
  const intensityScore = scoreIntensity(text, fingerprint.emotionalIntensity)
  const pacingScore = scorePacing(text, fingerprint.pacing)

  let hookScore = 75
  if (step === 'hook' || step === 'title') {
    hookScore = scoreHookStyle(text, fingerprint.hookStyle)
  }

  const weights =
    step === 'hook' || step === 'title'
      ? { rhythm: 0.2, intensity: 0.25, pacing: 0.2, hook: 0.35 }
      : step === 'caption'
        ? { rhythm: 0.3, intensity: 0.25, pacing: 0.15, hook: 0.3 }
        : { rhythm: 0.3, intensity: 0.3, pacing: 0.25, hook: 0.15 }

  const total = Math.round(
    rhythmScore * weights.rhythm +
      intensityScore * weights.intensity +
      pacingScore * weights.pacing +
      hookScore * weights.hook
  )

  return Math.min(100, Math.max(0, total))
}

export function isStyleConsistent(
  output: string | Record<string, unknown>,
  fingerprint: CreatorStyleFingerprint,
  step: StyleConsistencyStep,
  threshold = STYLE_CONSISTENCY_THRESHOLD
): boolean {
  return scoreOutputConsistency(output, fingerprint, step) >= threshold
}
