import type { CreatorMemory } from '@/lib/companion/types'

export type RelationshipLevel =
  | 'explorer'
  | 'collaborator'
  | 'partner'
  | 'director'
  | 'creative_soulmate'

export type CreatorDna = {
  creatorType?: string
  audience?: string
  format?: string
  emotionalTrigger?: string
  voice?: string
  visualStyle?: string
  updatedAt?: string
}

export type MemoryGraphNodeType =
  | 'topic'
  | 'project'
  | 'hook'
  | 'theme'
  | 'creator'
  | 'brand'
  | 'campaign'
  | 'content'
  | 'asset'

export type MemoryGraphNode = {
  id: string
  type: MemoryGraphNodeType
  label: string
  weight?: number
}

export type MemoryGraphEdge = {
  from: string
  to: string
  relation: string
}

export type MemoryGraph = {
  nodes?: MemoryGraphNode[]
  edges?: MemoryGraphEdge[]
  updatedAt?: string
}

export type LearningEvent = {
  type: string
  payload?: Record<string, unknown>
  at: string
}

export type CreatorEventType =
  | 'hook_accept'
  | 'hook_regen'
  | 'script_regen'
  | 'rewrite'
  | 'export_success'
  | 'feedback_negative'
  | 'feedback_positive'
  | 'project_save'
  | 'reflection'
  | 'session_start'

export type CreatorPreferences = {
  niche?: string
  style?: string
  length?: number
  tone?: string
  platform?: string
}

export type MemoryProfile = {
  creatorMemory: CreatorMemory
  creatorDna: CreatorDna
  relationshipLevel: RelationshipLevel
  relationshipScore: number
  memoryGraph: MemoryGraph
  learningEvents: LearningEvent[]
  preferences: CreatorPreferences
  updatedAt?: string
}

export type TimelineEntry = {
  id: string
  type: string
  label: string
  projectId?: string | null
  at: string
  payload?: Record<string, unknown>
}

export type ReflectionInput = {
  projectId?: string | null
  highlight?: string
  worked?: string[]
  improve?: string[]
  learned?: string[]
  brief?: Record<string, unknown>
}

export type ReflectionResult = {
  summary: string
  worked: string[]
  improve: string[]
  learned: string[]
}

export const RELATIONSHIP_THRESHOLDS: { level: RelationshipLevel; minScore: number }[] = [
  { level: 'creative_soulmate', minScore: 500 },
  { level: 'director', minScore: 300 },
  { level: 'partner', minScore: 150 },
  { level: 'collaborator', minScore: 50 },
  { level: 'explorer', minScore: 0 },
]

/** Phase 3 typed agent memories */
export type MemoryKind = 'identity' | 'brand' | 'workflow' | 'preference' | 'feedback'

export type BrandProfile = {
  id: string
  slug: string
  displayName: string
  dna: CreatorDna
  preferences: Record<string, unknown>
  isDefault: boolean
}

export type CreatorPattern = {
  id: string
  patternType: string
  label: string
  strength: number
  payload?: Record<string, unknown>
  brandId?: string | null
}

export type ContentHistoryEntry = {
  id: string
  projectId?: string | null
  brandId?: string | null
  contentType: string
  title?: string
  hook?: string
  theme?: string
  platform?: string
  format?: string
  at: string
}

export type RetrievedMemoryBundle = {
  profile: MemoryProfile
  brands: BrandProfile[]
  activeBrand?: BrandProfile | null
  patterns: CreatorPattern[]
  history: ContentHistoryEntry[]
  agentMemories: Array<{ type: MemoryKind; key: string; content: string }>
  semanticHits: Array<{ text: string; score: number; sourceType: string }>
}

export const EVENT_SCORE_WEIGHTS: Partial<Record<CreatorEventType, number>> = {
  hook_accept: 3,
  export_success: 10,
  project_save: 2,
  reflection: 8,
  session_start: 1,
  feedback_positive: 5,
  hook_regen: 1,
  script_regen: 1,
  rewrite: 1,
  feedback_negative: 0,
}
