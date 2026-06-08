import type { StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'

/** Virlo-ready score slots — populated later by external API. */
export type VirloFrameworkScores = {
  viralityScore: number | null
  retentionScore: number | null
  shareabilityScore: number | null
  saveabilityScore: number | null
}

export type StoryFrameworkRecommendation = {
  framework: StoryFrameworkId
  title: string
  coreEmotion: string
  audienceDesire: string
  narrativeTension: string
  curiosityGap: string
  transformation: string
  confidenceScore: number
  /** Virlo market confidence 0-100 */
  virloConfidence?: number
  /** Creator graph affinity match 0-100 */
  creatorMatch?: number
  /** Virlo trend alignment 0-100 */
  virloTrend?: number
  /** Hybrid creator + market score 0-100 */
  combinedScore?: number
  marketStatus?: 'working_now' | 'emerging' | 'fading' | 'oversaturated' | null
}

export type ActiveStoryFramework = StoryFrameworkRecommendation & {
  id: string
  frameworkName: StoryFrameworkId
  selectedAt: string
} & Partial<VirloFrameworkScores>

export type FrameworkAnalysis = {
  act1: string
  act2: string
  act3: string
  conflict: string
  escalation: string
  patternInterrupt: string
  breakthrough: string
  resolution: string
  lesson: string
  sceneBeats: Array<{ index: number; beat: string; durationSec?: number }>
}
