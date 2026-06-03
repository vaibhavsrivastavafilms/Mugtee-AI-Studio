import type { ExecutiveReview } from '@/lib/business/types'
import type { DecisionRecommendation } from '@/lib/business/decision-engine'

export function runDecisionAgent(input: {
  review: ExecutiveReview
  decisions: DecisionRecommendation[]
}) {
  return {
    role: 'DecisionAgent' as const,
    headline: input.review.headline,
    priorities: input.review.priorities,
    risks: input.review.risks,
    recommendations: input.decisions.map((d) => ({
      action: d.action,
      rationale: d.rationale,
      priority: d.priority,
      category: d.category,
    })),
    executiveSummary: [
      input.review.headline,
      ...input.review.priorities.slice(0, 2),
      `Revenue: ₹${input.review.revenueInr.toLocaleString('en-IN')}`,
    ].join(' · '),
  }
}
