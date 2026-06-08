import {
  STORY_FRAMEWORK_IDS,
  STORY_FRAMEWORKS,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import type { CreatorIntelligenceGraphData } from '@/lib/intelligence/types'
import type { StoryFrameworkRecommendation } from '@/lib/director/framework-types'
import type {
  HybridFrameworkRecommendation,
  TrendStatus,
  VirloMarketIntelligence,
} from '@/lib/virlo/types'

function frameworkTrendScore(
  framework: StoryFrameworkId,
  market: VirloMarketIntelligence | null | undefined
): { trendPct: number; status: TrendStatus | null } {
  if (!market) return { trendPct: 50, status: null }

  const all = [
    ...market.workingNow,
    ...market.emerging,
    ...market.fading,
    ...market.oversaturated,
  ].filter((i) => i.framework === framework)

  if (!all.length) return { trendPct: 45, status: null }

  const best = all.sort((a, b) => b.avgVirality - a.avgVirality)[0]!
  const statusBoost: Record<TrendStatus, number> = {
    working_now: 90,
    emerging: 72,
    fading: 35,
    oversaturated: 25,
  }

  return {
    trendPct: Math.round((statusBoost[best.status] + best.avgVirality) / 2),
    status: best.status,
  }
}

function creatorMatchScore(
  framework: StoryFrameworkId,
  graph: CreatorIntelligenceGraphData | null | undefined
): number {
  if (!graph) return 50
  const affinity = graph.frameworkAffinity[framework] ?? 0
  if (affinity > 0) return Math.min(95, affinity)
  const preferred = graph.creatorProfile.preferredFramework
  if (preferred === framework) return 78
  return 40
}

/** Merge creator graph + Virlo market into hybrid framework scores. */
export function buildHybridRecommendations(
  frameworks: StoryFrameworkId[],
  opts?: {
    creatorGraph?: CreatorIntelligenceGraphData | null
    market?: VirloMarketIntelligence | null
    baseConfidence?: Record<StoryFrameworkId, number>
  }
): HybridFrameworkRecommendation[] {
  return frameworks.map((framework) => {
    const { trendPct, status } = frameworkTrendScore(framework, opts?.market)
    const creatorMatch = creatorMatchScore(framework, opts?.creatorGraph)
    const virloConfidence = trendPct
    const base = opts?.baseConfidence?.[framework] ?? 60
    const combinedScore = Math.round(
      base * 0.35 + creatorMatch * 0.35 + virloConfidence * 0.3
    )

    const fw = STORY_FRAMEWORKS[framework]
    const rationale = status
      ? `Market signal: ${status.replace('_', ' ')} for ${fw.label} (${trendPct}% trend fit)`
      : `Creator-market blend for ${fw.label}`

    return {
      framework,
      virloConfidence,
      creatorMatch,
      virloTrend: trendPct,
      combinedScore,
      marketStatus: status,
      rationale,
    }
  })
}

/** Apply hybrid scores onto framework recommendation cards. */
export function enrichFrameworkRecommendations(
  recommendations: StoryFrameworkRecommendation[],
  opts?: {
    creatorGraph?: CreatorIntelligenceGraphData | null
    market?: VirloMarketIntelligence | null
  }
): StoryFrameworkRecommendation[] {
  const baseConfidence = Object.fromEntries(
    recommendations.map((r) => [r.framework, r.confidenceScore])
  ) as Record<StoryFrameworkId, number>

  const hybrid = buildHybridRecommendations(
    recommendations.map((r) => r.framework),
    {
      creatorGraph: opts?.creatorGraph,
      market: opts?.market,
      baseConfidence,
    }
  )

  const hybridMap = new Map(hybrid.map((h) => [h.framework, h]))

  return recommendations.map((rec) => {
    const h = hybridMap.get(rec.framework)
    if (!h) return rec
    return {
      ...rec,
      virloConfidence: h.virloConfidence,
      creatorMatch: h.creatorMatch,
      virloTrend: h.virloTrend,
      combinedScore: h.combinedScore,
      marketStatus: h.marketStatus,
      confidenceScore: h.combinedScore,
    }
  })
}

/** Pick top hybrid framework suggestion for a topic. */
export function topHybridFramework(
  idea: string,
  opts?: {
    creatorGraph?: CreatorIntelligenceGraphData | null
    market?: VirloMarketIntelligence | null
  }
): HybridFrameworkRecommendation {
  const blob = idea.toLowerCase()
  const ranked = STORY_FRAMEWORK_IDS.map((id) => {
    const fw = STORY_FRAMEWORKS[id]
    let score = 0
    for (const tag of fw.bestFor) {
      if (blob.includes(tag.replace(/-/g, ' ')) || blob.includes(tag)) score += 2
    }
    return id
  })

  const hybrid = buildHybridRecommendations(ranked, opts)
  return hybrid.sort((a, b) => b.combinedScore - a.combinedScore)[0]!
}
