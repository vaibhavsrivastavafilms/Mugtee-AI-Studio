import type { OpportunityItem, WeeklyContentPlan } from '@/lib/agent/types'
import type { MemoryProfile } from '@/lib/memory/types'
import type { CreatorReputation, CreatorWorldId } from '@/lib/multiverse/types'

export type RecommendedProject = {
  title: string
  topic: string
  format: string
  platform: string
}

export type CreatorDecision = {
  recommendedProject: RecommendedProject
  reasoningSummary: string
  whyThisMatters: string
  opportunityScore: number
  confidenceScore: number
  expectedImpact: string
  alternatives: CreatorDecision[]
}

export type DecisionEngineInput = {
  memoryProfile: MemoryProfile | null
  opportunities: OpportunityItem[]
  weeklyPlan: WeeklyContentPlan | null
  recentProjects: Array<{ title: string; topic?: string | null }>
  reputation: CreatorReputation | null
  world: CreatorWorldId | null
  missionStats?: { level?: number; streak?: number }
  niche?: string
  platform?: string
  negativeFeedbackTopics?: string[]
}

export type DecisionHistoryEntry = {
  at: string
  event: 'decision_shown' | 'decision_accepted'
  topic: string
  title: string
  opportunityScore: number
  confidenceScore: number
  format?: string
  platform?: string
}
