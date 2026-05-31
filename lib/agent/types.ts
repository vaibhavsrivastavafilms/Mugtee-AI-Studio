export type OpportunityType =
  | 'high_opportunity'
  | 'emerging_trend'
  | 'underserved_niche'
  | 'low_competition'

export type OpportunityItem = {
  id?: string
  title: string
  type: OpportunityType
  description?: string
  opportunityScore: number
  competitionScore: number
  viralPotential: number
  why?: string
  how?: string
  format?: string
  topic?: string
}

export type FeedSection = {
  type: OpportunityType
  label: string
  items: OpportunityItem[]
}

export type WeeklyPlanSlot = {
  id: string
  format: 'short' | 'reel' | 'long_form' | 'experimental'
  title: string
  topic: string
  hookPreview?: string
  day?: string
  rationale?: string
}

export type WeeklyContentPlan = {
  weekStart: string
  slots: WeeklyPlanSlot[]
  summary?: string
}

export type ParsedIdea = {
  topic?: string
  hook?: string
  format?: string
  emotion?: string
  tags?: string[]
}

export type SmartSuggestion = {
  id: string
  title: string
  body: string
  actionLabel?: string
  href?: string
}

export type PublishingCheckItem = {
  key: string
  label: string
  score: number
  passed: boolean
  tip?: string
}

export type PublishingReview = {
  readinessScore: number
  items: PublishingCheckItem[]
  summary: string
}

export type AudiencePrediction = {
  predictedPerformanceScore: number
  retention: number
  emotion: number
  curiosity: number
  shareability: number
  commentPotential: number
  insight: string
}

export type CompetitorInsight = {
  competitorId: string
  name: string
  patterns: string[]
  opportunities: string[]
  note: string
}

export type CeoBriefing = {
  weekOf: string
  headline: string
  worked: string[]
  failed: string[]
  doubleDown: string[]
  opportunities: string[]
  nextContent: string[]
  cinematicNarrative?: string
  source: 'rules' | 'openai'
}

export type AgentPipelineStage =
  | 'research'
  | 'trend'
  | 'story'
  | 'hook'
  | 'growth'
  | 'memory'

export type AgentLabel = {
  id: AgentPipelineStage
  name: string
  role: string
  pipelineStep: string
}

export type CreatorAgentContext = {
  userId: string
  niche?: string
  platform?: string
  contentStyle?: string
  creatorGoal?: string
  creatorDna: Record<string, unknown>
  memoryGraph: Record<string, unknown>
  learningEvents: unknown[]
  topicCounts: Record<string, number>
}
