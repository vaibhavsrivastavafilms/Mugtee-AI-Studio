import type { CreatorAgentContext, FeedSection, OpportunityType } from '@/lib/agent/types'
import { generateOpportunities, opportunitiesByType } from '@/lib/agent/opportunity-radar'

const SECTION_LABELS: Record<OpportunityType, string> = {
  high_opportunity: 'High Opportunity',
  emerging_trend: 'Emerging Trend',
  underserved_niche: 'Underserved Niche',
  low_competition: 'Low Competition',
}

export function buildDailyOpportunityFeed(
  ctx: CreatorAgentContext,
  feedDate: string
): { sections: FeedSection[]; items: ReturnType<typeof generateOpportunities> } {
  const items = generateOpportunities(ctx, feedDate, 12)
  const byType = opportunitiesByType(items)

  const sections: FeedSection[] = (Object.keys(SECTION_LABELS) as OpportunityType[])
    .map((type) => ({
      type,
      label: SECTION_LABELS[type],
      items: byType[type].slice(0, 3),
    }))
    .filter((s) => s.items.length > 0)

  return { sections, items }
}

export function topOpportunityForBrief(ctx: CreatorAgentContext, feedDate: string) {
  const items = generateOpportunities(ctx, feedDate, 1)
  return items[0] ?? null
}
