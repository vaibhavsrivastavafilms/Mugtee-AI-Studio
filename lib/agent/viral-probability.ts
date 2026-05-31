import type { CreatorAgentContext } from '@/lib/agent/types'
import { clampScore, hashSeed } from '@/lib/agent/agent-context'
import { openingCuriosityScore } from '@/lib/cinematic/execution/emotional-opening-system'

export function scoreViralProbability(input: {
  topic?: string
  hookPreview?: string
  ctx?: CreatorAgentContext
  competitionScore?: number
}): number {
  const hook = input.hookPreview?.trim() ?? input.topic?.trim() ?? ''
  const ctx = input.ctx
  let score = 45

  if (hook) {
    score += Math.min(25, openingCuriosityScore(hook) * 4)
    if (hook.length >= 30 && hook.length <= 140) score += 8
    if (/\b(you|your)\b/i.test(hook)) score += 6
  }

  if (ctx?.topicCounts && input.topic) {
    const key = input.topic.toLowerCase()
    if (Object.keys(ctx.topicCounts).some((t) => key.includes(t) || t.includes(key))) {
      score += 12
    }
  }

  if (ctx?.niche && input.topic?.toLowerCase().includes(ctx.niche.toLowerCase().split(' ')[0] ?? '')) {
    score += 8
  }

  const competition = input.competitionScore ?? 50
  score += Math.round((100 - competition) * 0.15)

  if (ctx?.userId && input.topic) {
    score += (hashSeed(`${ctx.userId}-${input.topic}`) % 9) - 4
  }

  return clampScore(score)
}

export function viralLabel(score: number): { label: string; tone: 'high' | 'medium' | 'low' } {
  if (score >= 75) return { label: 'High viral potential', tone: 'high' }
  if (score >= 55) return { label: 'Moderate viral potential', tone: 'medium' }
  return { label: 'Build the hook first', tone: 'low' }
}
