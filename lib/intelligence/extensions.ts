import type { CreatorIntelligenceGraphData, Insight } from '@/lib/intelligence/types'

import { formatVirloMarketForPrompt } from '@/lib/virlo/virlo-prompt-injection'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'

/** Ingest Virlo trend intelligence into graph affinity maps. */
export interface VirloIntelligence {
  ingestTrendSignals(signals: {
    trendingHooks: string[]
    retentionPatterns: string[]
    niche: string
  }): Promise<Partial<CreatorIntelligenceGraphData>>
  formatForPrompt(platform?: string | null): Promise<string>
}

/** Future: audience feedback loop from post-publish metrics. */
export interface AudienceFeedback {
  ingestFeedback(feedback: {
    projectId: string
    views: number
    retentionPct: number
    shareRate: number
    commentsSentiment?: 'positive' | 'mixed' | 'negative'
  }): Promise<Partial<CreatorIntelligenceGraphData>>
}

/** Future: performance-based learning to boost successful patterns. */
export interface PerformanceLearning {
  boostFromPerformance(
    graph: CreatorIntelligenceGraphData,
    metrics: { projectId: string; score: number }
  ): CreatorIntelligenceGraphData
}

/** Future: publishing analytics integration. */
export interface PublishingAnalytics {
  syncAnalytics(analytics: {
    platform: string
    topPerformingFramework?: string
    avgWatchTimeSec?: number
  }): Promise<Insight[]>
}

export const virloIntelligence: VirloIntelligence = {
  async ingestTrendSignals() {
    return {}
  },
  async formatForPrompt(platform) {
    const market = await loadVirloMarketIntelligence(platform ?? null)
    return formatVirloMarketForPrompt(market)
  },
}

/** @deprecated Use virloIntelligence */
export const virloIntelligenceStub = virloIntelligence

export const audienceFeedbackStub: AudienceFeedback = {
  async ingestFeedback() {
    return {}
  },
}

export const performanceLearningStub: PerformanceLearning = {
  boostFromPerformance(graph) {
    return graph
  },
}

export const publishingAnalyticsStub: PublishingAnalytics = {
  async syncAnalytics() {
    return []
  },
}
