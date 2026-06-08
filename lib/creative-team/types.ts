import type { ActiveStoryFramework, FrameworkAnalysis, StoryFrameworkRecommendation } from '@/lib/director/framework-types'
import type {
  CameraLanguagePlan,
  DirectorBlueprint,
  DirectorTreatment,
  MusicDirection,
  StoryDirectionOption,
  VoiceProfile,
} from '@/lib/director/types'
import type { ProducerReport } from '@/lib/director/producer/types'
import type { StoryDirectorPackage } from '@/lib/ai/director/story-director-engine'
import type { CreatorIntelligenceGraphData } from '@/lib/intelligence/types'
import type { VirloMarketIntelligence } from '@/lib/virlo/types'

export const CREATIVE_TEAM_AGENT_IDS = [
  'story-strategist',
  'executive-producer',
  'screenwriter',
  'cinematographer',
  'voice-director',
  'music-director',
] as const

export type CreativeTeamAgentId = (typeof CREATIVE_TEAM_AGENT_IDS)[number]

export type AgentState = 'pending' | 'running' | 'accepted' | 'rejected' | 'regenerate'

export type AgentStatesMap = Record<CreativeTeamAgentId, AgentState>

export const DEFAULT_AGENT_STATES: AgentStatesMap = {
  'story-strategist': 'pending',
  'executive-producer': 'pending',
  screenwriter: 'pending',
  cinematographer: 'pending',
  'voice-director': 'pending',
  'music-director': 'pending',
}

export type AgentReport<TPayload = unknown> = {
  agentId: CreativeTeamAgentId
  title: string
  summary: string
  preview: string
  payload: TPayload
  generatedAt: string
}

export type StoryStrategyPayload = {
  recommendations: StoryFrameworkRecommendation[]
  strategicNotes: string[]
  audienceFit: string
}

export type ScreenwriterPayload = {
  blueprint: DirectorBlueprint
  frameworkAnalysis: FrameworkAnalysis
  storyPackageHint: Partial<StoryDirectorPackage> | null
}

export type CinematographyPayload = {
  cameraLanguage: CameraLanguagePlan
}

export type VoicePayload = {
  voiceProfile: VoiceProfile
}

export type MusicPayload = {
  musicDirection: MusicDirection
}

export type CreativeAlignmentScore = {
  overall: number
  story: number
  visuals: number
  voice: number
  music: number
  audienceFit: number
}

export type CreativeTeamPackage = {
  reportId: string
  projectId: string
  userId: string
  storyStrategy: AgentReport<StoryStrategyPayload> | null
  producerReport: AgentReport<ProducerReport> | null
  screenwriterReport: AgentReport<ScreenwriterPayload> | null
  cinematographyReport: AgentReport<CinematographyPayload> | null
  voiceReport: AgentReport<VoicePayload> | null
  musicReport: AgentReport<MusicPayload> | null
  alignmentScore: CreativeAlignmentScore | null
  agentStates: AgentStatesMap
  createdAt: string
  updatedAt: string
}

export type CreativeTeamContext = {
  projectId: string
  userId: string
  idea: string
  storyDirection?: StoryDirectionOption | null
  activeFramework?: ActiveStoryFramework | null
  frameworkAnalysis?: FrameworkAnalysis | null
  directorTreatment?: DirectorTreatment | null
  blueprint?: DirectorBlueprint | null
  directorMemoryPrompt?: string
  intelligenceGraphPrompt?: string
  virloMarketPrompt?: string
  producerMemoryPrompt?: string
  creatorDna?: {
    niche?: string
    tone?: string
    platform?: string
    emotionalGoal?: string
  }
  creatorGraph?: CreatorIntelligenceGraphData | null
  virloMarket?: VirloMarketIntelligence | null
  priorReports?: Partial<Record<CreativeTeamAgentId, AgentReport>>
}

export interface CreativeTeamAgent {
  id: CreativeTeamAgentId
  name: string
  run(ctx: CreativeTeamContext): Promise<AgentReport>
}
