import type { CreatorMemoryProfile, DirectorProjectAnalysis } from '@/lib/director/memory/types'

/** Future: learn from Virlo trend patterns and inject into director recommendations. */
export interface VirloPatternLearning {
  ingestVirloSignals(signals: {
    trendingHooks: string[]
    retentionPatterns: string[]
    niche: string
  }): Promise<Partial<DirectorProjectAnalysis>>
  formatVirloMemoryForPrompt(memory: CreatorMemoryProfile): string
}

/** Future: learn from audience response (views, retention, shares) per project. */
export interface AudienceResponseLearning {
  ingestAudienceMetrics(metrics: {
    projectId: string
    views: number
    retentionPct: number
    shareRate: number
  }): Promise<Partial<DirectorProjectAnalysis>>
  boostSuccessfulPatterns(memory: CreatorMemoryProfile): CreatorMemoryProfile
}

/** Stub implementations — wired in a future release. */
export const virloPatternLearningStub: VirloPatternLearning = {
  async ingestVirloSignals() {
    return {}
  },
  formatVirloMemoryForPrompt() {
    return ''
  },
}

export const audienceResponseLearningStub: AudienceResponseLearning = {
  async ingestAudienceMetrics() {
    return {}
  },
  boostSuccessfulPatterns(memory) {
    return memory
  },
}
