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
