import type { EmotionType } from '@/lib/virlo/types'

const EMOTION_PATTERNS: Array<{ emotion: EmotionType; pattern: RegExp; weight: number }> = [
  { emotion: 'fear', pattern: /\b(fear|afraid|danger|risk|warning|anxiety|scared)\b/i, weight: 2 },
  { emotion: 'anger', pattern: /\b(angry|frustrat|unfair|hate|wrong|stop|fed up)\b/i, weight: 2 },
  { emotion: 'humor', pattern: /\b(funny|lol|joke|ridiculous|absurd|hilarious)\b/i, weight: 2 },
  { emotion: 'empathy', pattern: /\b(feel|struggle|alone|understand|relat|vulnerable|honest)\b/i, weight: 2 },
  { emotion: 'inspiration', pattern: /\b(inspir|motivat|transform|achieve|dream|possible|change)\b/i, weight: 2 },
  { emotion: 'surprise', pattern: /\b(surpris|shock|unexpected|plot twist|actually|turns out)\b/i, weight: 2 },
  { emotion: 'curiosity', pattern: /\b(curios|secret|hidden|why|how|discover|reveal|unknown)\b/i, weight: 1 },
]

export type EmotionAnalysis = {
  emotion: EmotionType
  confidence: number
}

/** Detect dominant emotional driver in content. */
export function analyzeEmotion(content: string, emotionalGoal?: string): EmotionAnalysis {
  const scores = new Map<EmotionType, number>()

  for (const { emotion, pattern, weight } of EMOTION_PATTERNS) {
    const matches = content.match(pattern)
    if (matches) {
      scores.set(emotion, (scores.get(emotion) ?? 0) + matches.length * weight)
    }
  }

  if (emotionalGoal) {
    const goal = emotionalGoal.toLowerCase()
    if (goal.includes('curios')) scores.set('curiosity', (scores.get('curiosity') ?? 0) + 3)
    if (goal.includes('inspir')) scores.set('inspiration', (scores.get('inspiration') ?? 0) + 3)
    if (goal.includes('trust') || goal.includes('empath')) {
      scores.set('empathy', (scores.get('empathy') ?? 0) + 3)
    }
    if (goal.includes('surprise')) scores.set('surprise', (scores.get('surprise') ?? 0) + 3)
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const top = ranked[0]

  if (!top) {
    return { emotion: 'curiosity', confidence: 55 }
  }

  return {
    emotion: top[0],
    confidence: Math.min(90, 50 + top[1] * 6),
  }
}
