import { clampScore } from '@/lib/agent/agent-context'
import { generateOpportunities } from '@/lib/agent/opportunity-radar'
import type { CreatorAgentContext } from '@/lib/agent/types'
import type { OpportunityItem } from '@/lib/agent/types'
import type { CreatorDecision, DecisionEngineInput, RecommendedProject } from '@/lib/decision/types'

type ScoredCandidate = {
  opportunity: OpportunityItem
  score: number
  confidence: number
  reasons: string[]
}

function normalizeTopic(s: string): string {
  return s.toLowerCase().trim().slice(0, 120)
}

function topicOverlap(a: string, b: string): boolean {
  const na = normalizeTopic(a)
  const nb = normalizeTopic(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const wordsA = na.split(/\s+/).filter((w) => w.length > 3)
  return wordsA.some((w) => nb.includes(w))
}

function topGraphTopics(input: DecisionEngineInput, limit = 5): string[] {
  const nodes = input.memoryProfile?.memoryGraph?.nodes ?? []
  return [...nodes]
    .filter((n) => n.type === 'topic' && n.label)
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, limit)
    .map((n) => n.label)
}

function dnaNiche(input: DecisionEngineInput): string {
  const prefs = input.memoryProfile?.preferences?.niche
  const dna = input.memoryProfile?.creatorDna
  return (
    (input.niche ?? prefs ?? dna?.creatorType ?? '').toLowerCase().trim()
  )
}

function dnaFormat(input: DecisionEngineInput): string {
  return (
    input.memoryProfile?.creatorDna?.format ??
    input.memoryProfile?.preferences?.style ??
    ''
  ).toLowerCase()
}

function defaultPlatform(input: DecisionEngineInput): string {
  return (
    input.platform ??
    input.memoryProfile?.preferences?.platform ??
    'youtube'
  ).toLowerCase()
}

function inferFormatFromOpportunity(item: OpportunityItem): string {
  const f = (item.format ?? 'short').toLowerCase()
  if (f.includes('reel')) return 'reel'
  if (f.includes('long') || f.includes('documentary')) return 'long_form'
  if (f.includes('experimental')) return 'experimental'
  if (f.includes('short') || f.includes('30s') || f.includes('45s') || f.includes('60s')) {
    return 'short'
  }
  return 'short'
}

function weeklyFormatGap(input: DecisionEngineInput): 'reel' | 'long_form' | 'short' | null {
  const plan = input.weeklyPlan
  if (!plan?.slots?.length) return null

  const recentText = input.recentProjects
    .map((p) => `${p.title} ${p.topic ?? ''}`.toLowerCase())
    .join(' ')

  const reelSlots = plan.slots.filter((s) => s.format === 'reel').length
  const hasRecentReel =
    recentText.includes('reel') || recentText.includes('60s') || recentText.includes('45s')
  if (reelSlots >= 3 && !hasRecentReel) return 'reel'

  const longSlots = plan.slots.filter((s) => s.format === 'long_form').length
  const hasRecentLong = recentText.includes('long') || recentText.includes('documentary')
  if (longSlots >= 1 && !hasRecentLong && (input.reputation?.quality ?? 0) >= 40) {
    return 'long_form'
  }

  const shortSlots = plan.slots.filter((s) => s.format === 'short').length
  if (shortSlots >= 5 && !recentText.includes('short')) return 'short'

  return null
}

function memoryDataRichness(input: DecisionEngineInput): number {
  let score = 15
  const profile = input.memoryProfile
  if (!profile) return score

  const nodes = profile.memoryGraph?.nodes?.length ?? 0
  const events = profile.learningEvents?.length ?? 0
  const dna = profile.creatorDna
  if (dna.creatorType || dna.audience) score += 12
  if (dna.format || dna.emotionalTrigger) score += 10
  if (dna.voice || dna.visualStyle) score += 8
  score += Math.min(25, nodes * 2)
  score += Math.min(20, events * 2)
  if (profile.relationshipScore > 50) score += 10
  if (input.opportunities.length >= 3) score += 10
  if (input.recentProjects.length >= 1) score += 8
  if (input.world) score += 5

  return clampScore(score)
}

function worldImpactHint(world: DecisionEngineInput['world'], format: string): string {
  const w = world ?? 'cinema'
  const labels: Record<string, string> = {
    documentary: 'documentary audience',
    cinema: 'cinematic short-form fans',
    business: 'professional audience',
    history: 'history and narrative viewers',
    luxury: 'premium aesthetic followers',
    education: 'learners seeking clarity',
    motivation: 'motivation and growth community',
  }
  const audience = labels[w] ?? 'your audience'
  if (format.includes('reel') || format === 'reel') {
    return `High retention potential for ${audience} on short-form`
  }
  if (format === 'long_form') {
    return `Authority-building impact for ${audience}`
  }
  return `Strong discovery potential for ${audience}`
}

function scoreCandidate(
  item: OpportunityItem,
  input: DecisionEngineInput,
  graphTopics: string[],
  gap: ReturnType<typeof weeklyFormatGap>
): ScoredCandidate {
  let score = item.opportunityScore ?? 50
  const reasons: string[] = []

  const niche = dnaNiche(input)
  const topic = item.topic ?? item.title
  const fmt = inferFormatFromOpportunity(item)

  if (niche && topic.toLowerCase().includes(niche.split(' ')[0] ?? '')) {
    score += 10
    reasons.push('Matches your niche')
  }

  const prefFormat = dnaFormat(input)
  if (prefFormat && (item.format ?? '').toLowerCase().includes(prefFormat)) {
    score += 8
    reasons.push('Aligns with your preferred format')
  }

  for (const gt of graphTopics) {
    if (topicOverlap(topic, gt)) {
      score += 12
      reasons.push(`Connects to memory topic “${gt}”`)
      break
    }
  }

  for (const bad of input.negativeFeedbackTopics ?? []) {
    if (topicOverlap(topic, bad)) {
      score -= 22
      reasons.push('Similar to a topic you recently passed on')
      break
    }
  }

  if (gap && fmt === gap) {
    score += 14
    reasons.push(`Fills this week’s ${gap.replace('_', ' ')} gap`)
  }

  if (item.viralPotential >= 75) {
    score += 4
  }
  if (item.competitionScore <= 35) {
    score += 5
    reasons.push('Lower competition window')
  }

  const confidence = clampScore(
    memoryDataRichness(input) + (reasons.length > 1 ? 8 : 0) + (graphTopics.length > 0 ? 5 : 0)
  )

  return {
    opportunity: item,
    score: clampScore(score),
    confidence,
    reasons,
  }
}

function toRecommendedProject(
  item: OpportunityItem,
  input: DecisionEngineInput
): RecommendedProject {
  return {
    title: item.title,
    topic: (item.topic ?? item.title).slice(0, 120),
    format: item.format ?? inferFormatFromOpportunity(item),
    platform: defaultPlatform(input),
  }
}

function buildDecisionFromCandidate(
  candidate: ScoredCandidate,
  input: DecisionEngineInput,
  graphTopics: string[]
): CreatorDecision {
  const item = candidate.opportunity
  const project = toRecommendedProject(item, input)
  const fmt = inferFormatFromOpportunity(item)

  const why =
    item.why ??
    item.description ??
    'This angle fits your current growth trajectory.'

  const reasoning =
    candidate.reasons.length > 0
      ? candidate.reasons.join(' · ')
      : `Opportunity score ${candidate.score} based on your feed and creator DNA.`

  return {
    recommendedProject: project,
    reasoningSummary: reasoning,
    whyThisMatters: why,
    opportunityScore: candidate.score,
    confidenceScore: candidate.confidence,
    expectedImpact: worldImpactHint(input.world, fmt),
    alternatives: [],
  }
}

function fallbackOpportunity(ctx: CreatorAgentContext, feedDate: string): OpportunityItem {
  const items = generateOpportunities(ctx, feedDate, 1)
  return (
    items[0] ?? {
      title: 'Start with a signature hook',
      type: 'high_opportunity',
      topic: 'your core theme',
      opportunityScore: 72,
      competitionScore: 40,
      viralPotential: 70,
      why: 'Your memory profile is still warming up — this template is a proven opener.',
      how: 'Pick one tension, one payoff, one CTA.',
      format: '60s reel',
    }
  )
}

/** Rules-only decision: memory + opportunities + weekly plan + multiverse context */
export function computeCreatorDecision(
  input: DecisionEngineInput,
  agentCtx?: CreatorAgentContext,
  feedDate?: string
): CreatorDecision {
  const date = feedDate ?? new Date().toISOString().slice(0, 10)
  let opportunities = input.opportunities

  if (!opportunities.length && agentCtx) {
    opportunities = generateOpportunities(agentCtx, date, 8)
  }

  if (!opportunities.length && agentCtx) {
    opportunities = [fallbackOpportunity(agentCtx, date)]
  }

  const graphTopics = topGraphTopics(input)
  const gap = weeklyFormatGap(input)

  const scored = opportunities
    .map((o) => scoreCandidate(o, input, graphTopics, gap))
    .sort((a, b) => b.score - a.score)

  const primary = scored[0]
  if (!primary) {
    const stub = fallbackOpportunity(
      agentCtx ?? {
        userId: 'anon',
        creatorDna: {},
        memoryGraph: {},
        learningEvents: [],
        topicCounts: {},
      },
      date
    )
    const candidate: ScoredCandidate = {
      opportunity: stub,
      score: stub.opportunityScore,
      confidence: 35,
      reasons: ['Fallback while your profile loads'],
    }
    const decision = buildDecisionFromCandidate(candidate, input, graphTopics)
    return decision
  }

  const main = buildDecisionFromCandidate(primary, input, graphTopics)
  const alts = scored.slice(1, 4).map((c) => buildDecisionFromCandidate(c, input, graphTopics))

  return { ...main, alternatives: alts }
}
