import type { EmotionalDimensionLabel, EmotionalStoryAnalysis } from '@/lib/companion/types'

type AnalysisInput = {
  hook?: string
  script?: string
  scenes?: Array<{ title?: string; description?: string; duration?: number }>
  duration?: number
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function labelFromScore(score: number): EmotionalDimensionLabel {
  if (score >= 0.75) return 'Strong'
  if (score >= 0.55) return 'High'
  if (score >= 0.4) return 'Building'
  if (score >= 0.25) return 'Steady'
  return 'Needs lift'
}

function curiosityScore(input: AnalysisInput): number {
  const hook = input.hook ?? ''
  let score = 0.35
  if (/\?|what if|nobody|secret|never|until|but then/i.test(hook)) score += 0.25
  if (hook.length >= 40 && hook.length <= 180) score += 0.15
  if (wordCount(hook) >= 8) score += 0.1
  return Math.min(1, score)
}

function emotionScore(input: AnalysisInput): number {
  const blob = `${input.hook ?? ''} ${input.script ?? ''}`.toLowerCase()
  let score = 0.3
  const emotionalWords =
    /feel|heart|fear|love|loss|hope|pain|dream|memory|alone|together|tears|silence/
  const matches = blob.match(new RegExp(emotionalWords.source, 'g'))
  score += Math.min(0.45, (matches?.length ?? 0) * 0.06)
  return Math.min(1, score)
}

function visualPowerScore(input: AnalysisInput): number {
  const scenes = input.scenes ?? []
  if (!scenes.length) return 0.4
  let score = 0.35
  const withDesc = scenes.filter((s) => (s.description?.length ?? 0) > 20).length
  score += (withDesc / scenes.length) * 0.35
  if (scenes.length >= 4) score += 0.15
  return Math.min(1, score)
}

function retentionScore(input: AnalysisInput): number {
  const script = input.script ?? ''
  const duration = input.duration ?? 60
  const wpm = wordCount(script) / Math.max(duration / 60, 0.5)
  let score = 0.4
  if (wpm >= 120 && wpm <= 180) score += 0.25
  if (/\n\n|—|\. \w/.test(script)) score += 0.1
  const scenes = input.scenes?.length ?? 0
  if (scenes >= 3 && scenes <= 8) score += 0.15
  return Math.min(1, score)
}

function storyFlowScore(input: AnalysisInput): number {
  const script = input.script ?? ''
  let score = 0.35
  if (/first|then|finally|but|so when|years later|until/i.test(script)) score += 0.2
  const beats = script.split(/\n+/).filter((l) => l.trim().length > 12)
  if (beats.length >= 3) score += Math.min(0.35, beats.length * 0.05)
  return Math.min(1, score)
}

function buildSummary(analysis: Omit<EmotionalStoryAnalysis, 'summary' | 'analyzedAt'>): string {
  const strong = [
    analysis.curiosity === 'Strong' || analysis.curiosity === 'High' ? 'curiosity' : '',
    analysis.emotion === 'Strong' || analysis.emotion === 'High' ? 'emotion' : '',
    analysis.visualPower === 'Strong' || analysis.visualPower === 'High' ? 'visuals' : '',
  ].filter(Boolean)

  if (strong.length >= 2) {
    return `Your ${strong.slice(0, 2).join(' and ')} are carrying this reel — lean into them.`
  }
  if (analysis.retention === 'Needs lift' || analysis.storyFlow === 'Needs lift') {
    return 'Middle needs one sharper turn — a question, a cut, or a breath before the payoff.'
  }
  return 'Story arc is forming. Mugtee\'s watching the rhythm — you\'re on track.'
}

export function analyzeEmotionalStory(input: AnalysisInput): EmotionalStoryAnalysis {
  const curiosity = labelFromScore(curiosityScore(input))
  const emotion = labelFromScore(emotionScore(input))
  const visualPower = labelFromScore(visualPowerScore(input))
  const retention = labelFromScore(retentionScore(input))
  const storyFlow = labelFromScore(storyFlowScore(input))

  const partial = { curiosity, emotion, visualPower, retention, storyFlow }
  return {
    ...partial,
    summary: buildSummary(partial),
    analyzedAt: new Date().toISOString(),
  }
}

export const EMOTIONAL_DIMENSION_LABELS: Record<
  keyof Omit<EmotionalStoryAnalysis, 'summary' | 'analyzedAt'>,
  string
> = {
  curiosity: 'Curiosity',
  emotion: 'Emotion',
  visualPower: 'Visual Power',
  retention: 'Retention',
  storyFlow: 'Story Flow',
}
