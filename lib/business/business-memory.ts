import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AudienceSegment,
  BusinessGoal,
  BusinessInsight,
  BusinessLead,
  BusinessRevenueEvent,
  BusinessTwin,
  BusinessTwinMetrics,
  BusinessTwinModel,
  ContentOutcome,
  GoalMilestone,
  GrowthMetric,
} from '@/lib/business/types'
import { EMPTY_TWIN_MODEL } from '@/lib/business/types'

function parseModel(raw: unknown): BusinessTwinModel {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_TWIN_MODEL }
  const m = raw as Record<string, unknown>
  return {
    offers: Array.isArray(m.offers) ? (m.offers as BusinessTwinModel['offers']) : [],
    products: Array.isArray(m.products) ? (m.products as BusinessTwinModel['products']) : [],
    services: Array.isArray(m.services) ? (m.services as BusinessTwinModel['services']) : [],
    campaigns: Array.isArray(m.campaigns) ? (m.campaigns as BusinessTwinModel['campaigns']) : [],
    clients: Array.isArray(m.clients) ? (m.clients as BusinessTwinModel['clients']) : [],
  }
}

function parseMetrics(raw: unknown): BusinessTwinMetrics {
  if (!raw || typeof raw !== 'object') return {}
  return raw as BusinessTwinMetrics
}

function rowToTwin(row: Record<string, unknown>): BusinessTwin {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    brandId: row.brand_id ? String(row.brand_id) : null,
    workspaceId: row.workspace_id ? String(row.workspace_id) : null,
    displayName: String(row.display_name ?? 'My Business'),
    model: parseModel(row.model),
    metrics: parseMetrics(row.metrics),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function getOrCreateBusinessTwin(
  supabase: SupabaseClient,
  userId: string,
  opts?: { brandId?: string | null; displayName?: string }
): Promise<BusinessTwin> {
  let q = supabase.from('business_twins').select('*').eq('user_id', userId)
  if (opts?.brandId) q = q.eq('brand_id', opts.brandId)
  else q = q.is('brand_id', null)

  const { data: existing } = await q.maybeSingle()
  if (existing) return rowToTwin(existing as Record<string, unknown>)

  const { data: inserted, error } = await supabase
    .from('business_twins')
    .insert({
      user_id: userId,
      brand_id: opts?.brandId ?? null,
      display_name: opts?.displayName ?? 'My Business',
      model: EMPTY_TWIN_MODEL,
      metrics: {},
    })
    .select('*')
    .single()

  if (error || !inserted) throw new Error(error?.message ?? 'Could not create business twin')
  return rowToTwin(inserted as Record<string, unknown>)
}

export async function updateBusinessTwin(
  supabase: SupabaseClient,
  userId: string,
  twinId: string,
  patch: Partial<{ model: BusinessTwinModel; metrics: BusinessTwinMetrics; displayName: string }>
): Promise<BusinessTwin> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.model) row.model = patch.model
  if (patch.metrics) row.metrics = patch.metrics
  if (patch.displayName) row.display_name = patch.displayName

  const { data, error } = await supabase
    .from('business_twins')
    .update(row)
    .eq('id', twinId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Twin update failed')
  return rowToTwin(data as Record<string, unknown>)
}

export async function listBusinessGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessGoal[]> {
  const { data } = await supabase
    .from('business_goals')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    metricType: r.metric_type as BusinessGoal['metricType'],
    title: String(r.title),
    targetValue: Number(r.target_value),
    currentValue: Number(r.current_value),
    milestones: (Array.isArray(r.milestones) ? r.milestones : []) as GoalMilestone[],
    status: r.status as BusinessGoal['status'],
    deadline: r.deadline ? String(r.deadline) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }))
}

export async function upsertBusinessGoal(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<BusinessGoal, 'userId' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string }
): Promise<BusinessGoal> {
  const row = {
    user_id: userId,
    brand_id: input.brandId,
    metric_type: input.metricType,
    title: input.title,
    target_value: input.targetValue,
    current_value: input.currentValue,
    milestones: input.milestones,
    status: input.status,
    deadline: input.deadline,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('business_goals')
      .update(row)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Goal update failed')
    return listBusinessGoals(supabase, userId).then((g) => g.find((x) => x.id === input.id)!)!
  }

  const { data, error } = await supabase
    .from('business_goals')
    .insert(row)
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Goal insert failed')
  const goals = await listBusinessGoals(supabase, userId)
  return goals[0]
}

export async function listLeads(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<BusinessLead[]> {
  const { data } = await supabase
    .from('business_leads')
    .select('*')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    sourceContentId: r.source_content_id ? String(r.source_content_id) : null,
    projectId: r.project_id ? String(r.project_id) : null,
    funnelStage: r.funnel_stage as BusinessLead['funnelStage'],
    score: Number(r.score),
    status: r.status as BusinessLead['status'],
    contact: (r.contact as Record<string, unknown>) ?? {},
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }))
}

export async function insertLead(
  supabase: SupabaseClient,
  userId: string,
  input: Partial<BusinessLead> & { funnelStage?: BusinessLead['funnelStage']; score?: number }
): Promise<BusinessLead> {
  const { data, error } = await supabase
    .from('business_leads')
    .insert({
      user_id: userId,
      brand_id: input.brandId ?? null,
      source_content_id: input.sourceContentId ?? null,
      project_id: input.projectId ?? null,
      funnel_stage: input.funnelStage ?? 'awareness',
      score: input.score ?? 40,
      status: input.status ?? 'new',
      contact: input.contact ?? {},
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Lead insert failed')
  const leads = await listLeads(supabase, userId, 1)
  return leads[0]
}

export async function listRevenueEvents(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<BusinessRevenueEvent[]> {
  const { data } = await supabase
    .from('business_revenue_events')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    leadId: r.lead_id ? String(r.lead_id) : null,
    amountInr: Number(r.amount_inr),
    eventType: r.event_type as BusinessRevenueEvent['eventType'],
    description: r.description ? String(r.description) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    occurredAt: String(r.occurred_at),
    createdAt: String(r.created_at),
  }))
}

export async function listAudienceSegments(
  supabase: SupabaseClient,
  userId: string
): Promise<AudienceSegment[]> {
  const { data } = await supabase
    .from('audience_segments')
    .select('*')
    .eq('user_id', userId)
    .order('size_estimate', { ascending: false })

  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    name: String(r.name),
    funnelStage: r.funnel_stage as AudienceSegment['funnelStage'],
    sizeEstimate: Number(r.size_estimate),
    attributes: (r.attributes as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }))
}

export async function listContentOutcomes(
  supabase: SupabaseClient,
  userId: string,
  limit = 40
): Promise<ContentOutcome[]> {
  const { data } = await supabase
    .from('content_outcomes')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    contentAssetId: r.content_asset_id ? String(r.content_asset_id) : null,
    projectId: r.project_id ? String(r.project_id) : null,
    funnelStage: r.funnel_stage as ContentOutcome['funnelStage'],
    engagementScore: Number(r.engagement_score),
    leadId: r.lead_id ? String(r.lead_id) : null,
    revenueEventId: r.revenue_event_id ? String(r.revenue_event_id) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    recordedAt: String(r.recorded_at),
  }))
}

export async function saveBusinessInsight(
  supabase: SupabaseClient,
  userId: string,
  input: {
    insightType: BusinessInsight['insightType']
    weekOf?: string
    brandId?: string | null
    payload: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('business_insights').insert({
    user_id: userId,
    brand_id: input.brandId ?? null,
    insight_type: input.insightType,
    week_of: input.weekOf ?? null,
    payload: input.payload,
  })
}

export async function listBusinessInsights(
  supabase: SupabaseClient,
  userId: string,
  insightType?: BusinessInsight['insightType'],
  limit = 20
): Promise<BusinessInsight[]> {
  let q = supabase
    .from('business_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (insightType) q = q.eq('insight_type', insightType)

  const { data } = await q
  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    insightType: r.insight_type as BusinessInsight['insightType'],
    weekOf: r.week_of ? String(r.week_of) : null,
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  }))
}

export async function upsertGrowthMetric(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<GrowthMetric, 'id' | 'userId'>
): Promise<void> {
  await supabase.from('growth_metrics').upsert(
    {
      user_id: userId,
      brand_id: input.brandId,
      metric_key: input.metricKey,
      value: input.value,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      metadata: input.metadata,
    },
    { onConflict: 'user_id,brand_id,metric_key,period_start,period_end' }
  )
}

export async function recordContentOutcome(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<ContentOutcome, 'id' | 'userId' | 'recordedAt'> & { recordedAt?: string }
): Promise<void> {
  await supabase.from('content_outcomes').insert({
    user_id: userId,
    brand_id: input.brandId,
    content_asset_id: input.contentAssetId,
    project_id: input.projectId,
    funnel_stage: input.funnelStage,
    engagement_score: input.engagementScore,
    lead_id: input.leadId,
    revenue_event_id: input.revenueEventId,
    metadata: input.metadata,
    recorded_at: input.recordedAt ?? new Date().toISOString(),
  })
}
