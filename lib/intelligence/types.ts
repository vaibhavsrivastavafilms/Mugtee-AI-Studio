import type { StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'
import type { CreatorDna } from '@/lib/memory/types'
import type { CreatorMemoryProfile } from '@/lib/director/memory/types'
import type { ProducerReport } from '@/lib/director/producer/types'
import type { CreatorStyleFingerprint } from '@/lib/ai/style-fingerprint'

export type AffinityMap = Record<string, number>

export type FrameworkAffinity = Record<StoryFrameworkId, number> & AffinityMap

export type VisualAffinity = {
  shotTypes: AffinityMap
  lighting: AffinityMap
  colorPalettes: AffinityMap
  composition: AffinityMap
  cameraMovements: AffinityMap
  visualStyles: AffinityMap
}

export type VoiceAffinity = {
  narratorTones: AffinityMap
  pacing: AffinityMap
  intensity: AffinityMap
  narrationTypes: AffinityMap
}

export type MotionAffinity = {
  motionStyles: AffinityMap
  zoomUsage: AffinityMap
  panUsage: AffinityMap
  driftUsage: AffinityMap
  pacing: AffinityMap
}

export type ProducerAffinity = {
  avgStoryScore: number
  avgAudienceScore: number
  avgEmotionScore: number
  avgRetentionScore: number
  avgCinematicScore: number
  productionReadyRate: number
  reportCount: number
  topStrengths: string[]
  topSuggestions: string[]
  acceptedSuggestionCount: number
}

export type AudienceAffinity = {
  niche: string | null
  platform: string | null
  emotionalGoal: string | null
  audience: string | null
  creatorType: string | null
  contentStyle: string | null
}

export type CreatorProfileSummary = {
  identityLabel: string
  projectCount: number
  directorApprovedCount: number
  preferredFramework: string | null
  preferredGenre: string | null
  preferredMood: string | null
  avgSceneCount: number
  avgDurationSec: number
  memoryDepth: number
  styleFingerprint: Partial<CreatorStyleFingerprint> | null
}

export type EvolutionEntry = {
  at: string
  event: 'memory_learned' | 'producer_report' | 'manual_rebuild' | 'framework_selected'
  projectId?: string | null
  summary: string
  snapshot?: {
    topFramework?: string | null
    topVisual?: string | null
    readinessScore?: number | null
  }
}

export type CreatorIntelligenceGraphData = {
  creatorProfile: CreatorProfileSummary
  frameworkAffinity: FrameworkAffinity
  visualAffinity: VisualAffinity
  voiceAffinity: VoiceAffinity
  motionAffinity: MotionAffinity
  producerAffinity: ProducerAffinity
  audienceAffinity: AudienceAffinity
  evolutionHistory: EvolutionEntry[]
}

export type InsightCategory =
  | 'framework'
  | 'visual'
  | 'voice'
  | 'motion'
  | 'producer'
  | 'audience'
  | 'identity'
  | 'recommendation'

export type Insight = {
  id: string
  category: InsightCategory
  text: string
  confidence: number
  source: 'rule' | 'aggregate'
  createdAt: string
}

export type CreatorIntelligenceGraph = {
  id: string
  userId: string
  graphData: CreatorIntelligenceGraphData
  insights: Insight[]
  createdAt: string
  updatedAt: string
}

export type IntelligenceSourceBundle = {
  creatorMemory: CreatorMemoryProfile
  producerReports: ProducerReport[]
  storyFrameworks: Array<{
    projectId: string
    frameworkName: string
    confidenceScore: number
    isActive: boolean
    updatedAt: string
  }>
  directorProjects: Array<{
    id: string
    title: string
    directorApproved: boolean
    updatedAt: string
  }>
  creatorDna: CreatorDna
  profileMeta: {
    niche: string | null
    platform: string | null
    contentStyle: string | null
  }
}

export const EMPTY_PRODUCER_AFFINITY: ProducerAffinity = {
  avgStoryScore: 0,
  avgAudienceScore: 0,
  avgEmotionScore: 0,
  avgRetentionScore: 0,
  avgCinematicScore: 0,
  productionReadyRate: 0,
  reportCount: 0,
  topStrengths: [],
  topSuggestions: [],
  acceptedSuggestionCount: 0,
}

export const EMPTY_AUDIENCE_AFFINITY: AudienceAffinity = {
  niche: null,
  platform: null,
  emotionalGoal: null,
  audience: null,
  creatorType: null,
  contentStyle: null,
}

export const EMPTY_CREATOR_PROFILE: CreatorProfileSummary = {
  identityLabel: 'Emerging Director',
  projectCount: 0,
  directorApprovedCount: 0,
  preferredFramework: null,
  preferredGenre: null,
  preferredMood: null,
  avgSceneCount: 0,
  avgDurationSec: 0,
  memoryDepth: 0,
  styleFingerprint: null,
}
