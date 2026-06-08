const RETENTION_SIGNALS: Array<{ label: string; pattern: RegExp; weight: number }> = [
  { label: 'pattern interrupt', pattern: /\b(pattern interrupt|cut to|suddenly|wait|but then|plot twist)\b/i, weight: 3 },
  { label: 'open loop', pattern: /\b(but first|before i tell|you won't believe|stay until|at the end)\b/i, weight: 3 },
  { label: 'tension escalation', pattern: /\b(worse|stakes|cost|pressure|escalat|building)\b/i, weight: 2 },
  { label: 'delayed reveal', pattern: /\b(reveal|result|outcome|finally|here's what|the truth)\b/i, weight: 2 },
  { label: 'visual reset', pattern: /\b(zoom|b-roll|montage|transition|split screen)\b/i, weight: 1 },
  { label: 'mid-video question', pattern: /\?/g, weight: 1 },
]

export type RetentionAnalysis = {
  retentionStrategy: string
  retentionScore: number
  signals: string[]
}

/** Analyze retention mechanics from content metadata. */
export function analyzeRetention(content: string): RetentionAnalysis {
  const signals: string[] = []
  let score = 45

  for (const { label, pattern, weight } of RETENTION_SIGNALS) {
    const matches = content.match(pattern)
    if (matches?.length) {
      signals.push(label)
      score += weight * Math.min(matches.length, 3)
    }
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length
  if (wordCount > 80) score += 5
  if (wordCount > 200) score += 5

  const strategyParts = signals.length
    ? signals.map((s) => s).join(' + ')
    : 'hook-first pacing with a mid-video payoff beat'

  return {
    retentionStrategy: strategyParts,
    retentionScore: Math.min(95, score),
    signals,
  }
}
