import type { GrowthRecommendation } from '@/lib/business/types'
import type { DecisionRecommendation } from '@/lib/business/decision-engine'

export type GrowthAgentInput = {
  goal: string
  strategy: {
    goals: unknown[]
    recommendations: GrowthRecommendation[]
    topContent: { title: string; id: string }[]
  }
  decisions: DecisionRecommendation[]
}

export function runGrowthAgent(input: GrowthAgentInput) {
  return {
    role: 'GrowthAgent' as const,
    summary: `Strategy for: ${input.goal.slice(0, 120)}`,
    audienceExpansion: input.strategy.recommendations.filter((r) =>
      ['awareness', 'consideration'].includes(r.funnelStage)
    ),
    campaignSuggestions: input.strategy.recommendations.filter((r) =>
      r.title.toLowerCase().includes('campaign')
    ),
    topActions: input.decisions.slice(0, 3).map((d) => d.action),
    contentToPromote: input.strategy.topContent,
  }
}
