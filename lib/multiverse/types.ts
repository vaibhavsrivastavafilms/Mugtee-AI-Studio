export type CreatorWorldId =
  | 'documentary'
  | 'cinema'
  | 'business'
  | 'history'
  | 'luxury'
  | 'education'
  | 'motivation'

export type ReputationRank =
  | 'beginner'
  | 'rising'
  | 'established'
  | 'notable'
  | 'elite'
  | 'legend'

export type CreatorReputation = {
  consistency: number
  quality: number
  publishing: number
  engagement: number
  learning: number
  rank: ReputationRank
}

export type SidekickPersonalityPreset =
  | 'strict_director'
  | 'wise_mentor'
  | 'hype_partner'
  | 'calm_strategist'
  | 'playful_editor'

export type SidekickPersonality = {
  preset: SidekickPersonalityPreset
  voice: string
  humour: string
  relationshipStyle: string
}

export type LegendaryProjectRef = {
  projectId: string
  title: string
  score: number
  exportedAt: string
}

export type StoryVaultEntry = {
  id: string
  projectId?: string | null
  title: string
  type: string
  at: string
  highlight?: string
}

export type HallOfFameCache = {
  bestStoryScore?: number
  bestScriptTitle?: string
  longestStreak?: number
  totalExports?: number
  topAchievement?: string
  updatedAt?: string
}

export type MultiverseProfile = {
  creatorWorld: CreatorWorldId | null
  creatorReputation: CreatorReputation
  creatorHqLevel: number
  sidekickPersonality: SidekickPersonality
  sidekickEvolutionTier: number
  legendaryProjects: LegendaryProjectRef[]
  storyVaultEntries: StoryVaultEntry[]
  hallOfFame: HallOfFameCache
  creatorXp: number
  creatorLevel: number
}

export const DEFAULT_REPUTATION: CreatorReputation = {
  consistency: 0,
  quality: 0,
  publishing: 0,
  engagement: 0,
  learning: 0,
  rank: 'beginner',
}

export const DEFAULT_SIDEKICK_PERSONALITY: SidekickPersonality = {
  preset: 'wise_mentor',
  voice: 'warm',
  humour: 'light',
  relationshipStyle: 'collaborative',
}

export const DEFAULT_MULTIVERSE_PROFILE: MultiverseProfile = {
  creatorWorld: null,
  creatorReputation: { ...DEFAULT_REPUTATION },
  creatorHqLevel: 1,
  sidekickPersonality: { ...DEFAULT_SIDEKICK_PERSONALITY },
  sidekickEvolutionTier: 1,
  legendaryProjects: [],
  storyVaultEntries: [],
  hallOfFame: {},
  creatorXp: 0,
  creatorLevel: 1,
}
