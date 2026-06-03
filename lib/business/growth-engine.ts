import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusinessGoal, GoalMilestone, GrowthRecommendation } from '@/lib/business/types'
import { listBusinessGoals, upsertBusinessGoal } from '@/lib/business/business-memory'
import { suggestAudienceExpansion } from '@/lib/business/audience-engine'
import { searchAssets } from '@/lib/assets/asset-search'

export function goalsToMilestones(
  goal: Pick<BusinessGoal, 'targetValue' | 'metricType' | 'title'>
): GoalMilestone[] {
  const steps = [0.25, 0.5, 0.75, 1]
  return steps.map((pct, i) => ({
    id: `m${i + 1}`,
    label:
      pct < 1
        ? `${Math.round(pct * 100)}% toward ${goal.title}`
        : `Hit ${goal.metricType} target`,
    targetValue: Math.round(goal.targetValue * pct),
    reached: false,
  }))
}

export async function planFromGoal(
  supabase: SupabaseClient,
  userId: string,
  input: {
    metricType: BusinessGoal['metricType']
    title: string
    targetValue: number
    deadline?: string | null
  }
): Promise<BusinessGoal> {
  const milestones = goalsToMilestones({
    metricType: input.metricType,
    title: input.title,
    targetValue: input.targetValue,
  })
  return upsertBusinessGoal(supabase, userId, {
    id: crypto.randomUUID(),
    metricType: input.metricType,
    title: input.title,
    targetValue: input.targetValue,
    currentValue: 0,
    milestones,
    status: 'active',
    deadline: input.deadline ?? null,
    brandId: null,
  })
}

export async function suggestGrowthStrategy(
  supabase: SupabaseClient,
  userId: string,
  goalText: string
): Promise<{
  goals: BusinessGoal[]
  recommendations: GrowthRecommendation[]
  topContent: { title: string; id: string }[]
}> {
  const [goals, recommendations, assets] = await Promise.all([
    listBusinessGoals(supabase, userId),
    suggestAudienceExpansion(supabase, userId, goalText),
    searchAssets(supabase, userId, { limit: 5 })
      .then((r) => r.assets)
      .catch(() => []),
  ])

  const campaignRec: GrowthRecommendation = {
    title: 'Launch campaign from latest export',
    description:
      assets[0]?.title
        ? `Promote "${assets[0].title}" with a 7-day awareness → consideration arc.`
        : 'Create one reel, then run a week-long funnel campaign.',
    funnelStage: 'awareness',
    impact: 'high',
  }

  return {
    goals,
    recommendations: [campaignRec, ...recommendations],
    topContent: assets.slice(0, 3).map((a) => ({ title: a.title, id: a.id })),
  }
}
