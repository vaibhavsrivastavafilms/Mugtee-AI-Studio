/** MugteeOS Phase 6 — Business Operating System types */

export type FunnelStage = 'awareness' | 'consideration' | 'conversion' | 'retention'

export type GoalMetricType = 'followers' | 'clients' | 'revenue_inr' | 'reservations'

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived'

export type LeadStatus = 'new' | 'nurturing' | 'qualified' | 'won' | 'lost'

export type BusinessRevenueEventType = 'sale' | 'booking' | 'subscription' | 'tip' | 'other'

export type InsightType = 'weekly_report' | 'worked' | 'failed' | 'opportunity' | 'decision'

export type BusinessOffer = {
  id: string
  name: string
  priceInr?: number
  description?: string
}

export type BusinessCampaign = {
  id: string
  name: string
  funnelStage: FunnelStage
  status: 'draft' | 'active' | 'completed'
}

export type BusinessClient = {
  id: string
  name: string
  status: LeadStatus
  lifetimeValueInr?: number
}

export type BusinessTwinModel = {
  offers: BusinessOffer[]
  products: BusinessOffer[]
  services: BusinessOffer[]
  campaigns: BusinessCampaign[]
  clients: BusinessClient[]
}

export type BusinessTwinMetrics = {
  followers?: number
  leadsCount?: number
  clientsCount?: number
  revenueInr?: number
  reservations?: number
  lastSyncedAt?: string
}

export type BusinessTwin = {
  id: string
  userId: string
  brandId: string | null
  workspaceId: string | null
  displayName: string
  model: BusinessTwinModel
  metrics: BusinessTwinMetrics
  createdAt: string
  updatedAt: string
}

export type GoalMilestone = {
  id: string
  label: string
  targetValue: number
  reached: boolean
  dueDate?: string
}

export type BusinessGoal = {
  id: string
  userId: string
  brandId: string | null
  metricType: GoalMetricType
  title: string
  targetValue: number
  currentValue: number
  milestones: GoalMilestone[]
  status: GoalStatus
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export type AudienceSegment = {
  id: string
  userId: string
  brandId: string | null
  name: string
  funnelStage: FunnelStage
  sizeEstimate: number
  attributes: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type BusinessLead = {
  id: string
  userId: string
  brandId: string | null
  sourceContentId: string | null
  projectId: string | null
  funnelStage: FunnelStage
  score: number
  status: LeadStatus
  contact: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type BusinessRevenueEvent = {
  id: string
  userId: string
  brandId: string | null
  leadId: string | null
  amountInr: number
  eventType: BusinessRevenueEventType
  description: string | null
  metadata: Record<string, unknown>
  occurredAt: string
  createdAt: string
}

export type GrowthMetric = {
  id: string
  userId: string
  brandId: string | null
  metricKey: string
  value: number
  periodStart: string
  periodEnd: string
  metadata: Record<string, unknown>
}

export type BusinessInsight = {
  id: string
  userId: string
  brandId: string | null
  insightType: InsightType
  weekOf: string | null
  payload: Record<string, unknown>
  createdAt: string
}

export type ContentOutcome = {
  id: string
  userId: string
  brandId: string | null
  contentAssetId: string | null
  projectId: string | null
  funnelStage: FunnelStage
  engagementScore: number
  leadId: string | null
  revenueEventId: string | null
  metadata: Record<string, unknown>
  recordedAt: string
}

export type BusinessGraphNode = {
  id: string
  type: 'brand' | 'audience' | 'campaign' | 'lead' | 'customer' | 'revenue' | 'content'
  label: string
  weight?: number
}

export type BusinessGraphEdge = {
  from: string
  to: string
  relation: string
}

export type BusinessKnowledgeGraph = {
  nodes: BusinessGraphNode[]
  edges: BusinessGraphEdge[]
}

export type ExecutiveReview = {
  weekOf: string
  headline: string
  priorities: string[]
  risks: string[]
  opportunities: string[]
  worked: string[]
  failed: string[]
  funnelSummary: Record<FunnelStage, number>
  revenueInr: number
  recommendedActions: string[]
  mode: 'coo' | 'growth'
}

export type GrowthRecommendation = {
  title: string
  description: string
  funnelStage: FunnelStage
  impact: 'high' | 'medium' | 'low'
}

export const EMPTY_TWIN_MODEL: BusinessTwinModel = {
  offers: [],
  products: [],
  services: [],
  campaigns: [],
  clients: [],
}
