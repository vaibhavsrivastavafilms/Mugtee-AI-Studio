import type { StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'

export type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'youtube-shorts'
  | 'x'
  | 'linkedin'

export type HookType =
  | 'curiosity'
  | 'contrarian'
  | 'warning'
  | 'question'
  | 'number'
  | 'story'

export type EmotionType =
  | 'curiosity'
  | 'surprise'
  | 'fear'
  | 'inspiration'
  | 'humor'
  | 'anger'
  | 'empathy'

export type FrameworkId = StoryFrameworkId

export type VirloScores = {
  viralityScore: number
  retentionScore: number
  shareabilityScore: number
  saveabilityScore: number
  storyQualityScore: number
  frameworkConfidence: number
}

export type ViralPattern = {
  id: string
  platform: PlatformId | string
  topic: string
  framework: FrameworkId | string
  hookType: HookType | string | null
  emotion: EmotionType | string | null
  curiosityTrigger: string | null
  retentionStrategy: string | null
  shareabilityScore: number
  saveabilityScore: number
  viralityScore: number
  storyQualityScore: number
  frameworkConfidence: number
  sourceUrl: string | null
  rawAnalysis: Record<string, unknown>
  createdAt: string
}

export type VirloAnalysis = {
  platform: PlatformId | string
  topic: string
  framework: FrameworkId
  hookType: HookType
  emotion: EmotionType
  curiosityTrigger: string
  retentionStrategy: string
  scores: VirloScores
  source: 'llm' | 'heuristic' | 'seed'
  rawAnalysis?: Record<string, unknown>
}

export type TrendStatus = 'working_now' | 'emerging' | 'fading' | 'oversaturated'

export type MarketTrendItem = {
  framework: FrameworkId | string
  hookType: string | null
  emotion: string | null
  topic: string
  platform: string
  avgVirality: number
  patternCount: number
  status: TrendStatus
  sampleTriggers: string[]
}

export type VirloMarketIntelligence = {
  platform: string | null
  workingNow: MarketTrendItem[]
  emerging: MarketTrendItem[]
  fading: MarketTrendItem[]
  oversaturated: MarketTrendItem[]
  recommendedPatterns: MarketTrendItem[]
  patternCount: number
  generatedAt: string
}

export type HybridFrameworkRecommendation = {
  framework: FrameworkId
  virloConfidence: number
  creatorMatch: number
  virloTrend: number
  combinedScore: number
  marketStatus: TrendStatus | null
  rationale: string
}

export type VirloAnalyzeInput = {
  content: string
  platform?: PlatformId | string
  topic?: string
  urlSnippet?: string
}
