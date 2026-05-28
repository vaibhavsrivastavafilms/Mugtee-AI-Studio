import type { CinematicNiche } from '@/lib/cinematic/niches'

export type VirloPlatform = 'instagram_reel' | 'youtube_short' | 'youtube_video'

export type EmotionalGoal =
  | 'curiosity'
  | 'tension'
  | 'awe'
  | 'recognition'
  | 'urgency'
  | 'intimacy'
  | 'defiance'

export type RetentionType = 'curiosity-gap' | 'open-loop' | 'escalation-ladder' | 'pattern-interrupt'

export type PacingStyle = 'slow-burn' | 'balanced' | 'staccato' | 'documentary'

export type StoryStructureId =
  | 'psychological-reveal'
  | 'documentary-tension'
  | 'fast-viral-retention'
  | 'emotional-cinema'

export type StoryStructureFormat = {
  id: StoryStructureId
  formatNumber: 1 | 2 | 3 | 4
  name: string
  pattern: string[]
  bestForNiches: CinematicNiche[]
  pacingHint: PacingStyle
  retentionType: RetentionType
  openingMove: string
  midpointTurn: string
  closingMove: string
}

export type HookCandidate = {
  text: string
  tensionScore: number
  pattern: string
  variant: string
}

export type RetentionBeat = {
  phase: 'hook' | 'build' | 'escalation' | 'peak' | 'payoff'
  secondsFromStart: number
  technique: RetentionType
  instruction: string
}

export type RetentionPlan = {
  type: RetentionType
  curiosityGaps: string[]
  openLoops: string[]
  escalationSteps: string[]
  payoffTimingSec: number
  beats: RetentionBeat[]
}

export type PacingProfile = {
  style: PacingStyle
  avgSentenceWords: number
  transitionStyle: string
  rhythmNotes: string[]
  narrationIntensity: 'whisper' | 'measured' | 'urgent' | 'cinematic'
}

export type SceneVisualLanguage = {
  sceneIndex: number
  camera: string
  framing: string
  lighting: string
  movement: string
  colorNote: string
}

export type VirloCreativeSeed = {
  seed: number
  narrativeRhythm: string
  narrationIntensity: PacingProfile['narrationIntensity']
  emotionalArc: string
  visualStyle: string
}

export type TopicAnalysis = {
  niche: CinematicNiche
  emotionalGoal: EmotionalGoal
  pacingStyle: PacingStyle
  retentionType: RetentionType
  platformBehavior: string
  recommendedStructure: StoryStructureId
}

export type VirloMemorySnapshot = {
  structureIds: StoryStructureId[]
  hookPatterns: string[]
  openingMoves: string[]
}

export type VirloBuildOptions = {
  platform?: VirloPlatform | string
  tone?: string
  duration?: number
  niche?: string
  sessionSeed?: string | number
  /** Skip recording to memory (e.g. dry-run) */
  skipMemory?: boolean
}

export type VirloContext = {
  idea: string
  topicAnalysis: TopicAnalysis
  structure: StoryStructureFormat
  emotionalGoal: EmotionalGoal
  emotionalNotes: string[]
  hooks: HookCandidate[]
  selectedHook: HookCandidate
  retention: RetentionPlan
  pacing: PacingProfile
  visuals: SceneVisualLanguage[]
  creativeSeed: VirloCreativeSeed
  memory: VirloMemorySnapshot
  platform: VirloPlatform
  tone: string
  duration: number
  sceneTarget: number
}

export type VirloMetadata = {
  structureId: StoryStructureId
  structureName: string
  hookVariant: string
  emotionalGoal: EmotionalGoal
  retentionType: RetentionType
  pacingStyle: PacingStyle
  seed: number
}
