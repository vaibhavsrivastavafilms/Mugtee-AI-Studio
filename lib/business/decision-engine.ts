import type { SupabaseClient } from '@supabase/supabase-js'
import { detectOpportunities } from '@/lib/business/opportunity-engine'
import { suggestGrowthStrategy } from '@/lib/business/growth-engine'
import { nurtureLeads } from '@/lib/business/lead-engine'
import { analyzeMonetization } from '@/lib/business/revenue-engine'
import { saveBusinessInsight } from '@/lib/business/business-memory'

export type DecisionRecommendation = {
  action: string
  rationale: string
  priority: number
  category: 'content' | 'leads' | 'revenue' | 'audience'
}

/** DecisionAgent — ranked action recommendations */
export async function recommendDecisions(
  supabase: SupabaseClient,
  userId: string,
  goal: string
): Promise<DecisionRecommendation[]> {
  const [growth, monetization, opportunities, nurture] = await Promise.all([
    suggestGrowthStrategy(supabase, userId, goal),
    analyzeMonetization(supabase, userId),
    detectOpportunities(supabase, userId, goal),
    nurtureLeads(supabase, userId),
  ])

  const recs: DecisionRecommendation[] = []

  if (growth.topContent[0]) {
    recs.push({
      action: `Run campaign on "${growth.topContent[0].title}"`,
      rationale: growth.recommendations[0]?.description ?? 'Top library asset',
      priority: 90,
      category: 'content',
    })
  }

  for (const a of nurture.actions.slice(0, 2)) {
    recs.push({
      action: a,
      rationale: 'High-score lead ready for nurture',
      priority: 85,
      category: 'leads',
    })
  }

  for (const m of monetization.recommendations) {
    recs.push({
      action: m.title,
      rationale: m.description,
      priority: m.impact === 'high' ? 88 : 70,
      category: 'revenue',
    })
  }

  for (const o of opportunities.slice(0, 2)) {
    recs.push({
      action: o.title,
      rationale: o.description,
      priority: o.impact === 'high' ? 82 : 65,
      category: 'audience',
    })
  }

  const sorted = recs.sort((a, b) => b.priority - a.priority).slice(0, 8)

  await saveBusinessInsight(supabase, userId, {
    insightType: 'decision',
    payload: { goal, recommendations: sorted },
  })

  return sorted
}
