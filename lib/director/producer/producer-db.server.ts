import { createSupabaseServerClient } from '@/lib/supabase/server'
import { aggregateProducerMemory, parseProducerMemory } from '@/lib/director/producer/producer-memory'
import type { ProducerMemory, ProducerReport } from '@/lib/director/producer/types'
import { EMPTY_PRODUCER_MEMORY } from '@/lib/director/producer/types'

type ProducerReportRow = {
  id: string
  project_id: string
  user_id: string
  story_score: number
  audience_score: number
  emotion_score: number
  visual_score: number
  retention_score: number
  shareability_score: number
  cinematic_score: number
  curiosity_score: number
  story_readiness_score: number
  production_ready: boolean
  recommendations: unknown
  producer_memory: unknown
  created_at: string
  updated_at: string
}

function rowToReport(row: ProducerReportRow): ProducerReport {
  const rec = (row.recommendations ?? {}) as ProducerReport['recommendations']
  const memory = parseProducerMemory(row.producer_memory)
  const productionReady = row.production_ready
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    scores: {
      storyStrength: row.story_score,
      audienceFit: row.audience_score,
      emotionalImpact: row.emotion_score,
      curiosity: row.curiosity_score,
      visualPotential: row.visual_score,
      retention: row.retention_score,
      shareability: row.shareability_score,
      cinematicQuality: row.cinematic_score,
    },
    storyReadinessScore: row.story_readiness_score,
    productionReady,
    readinessLabel: productionReady ? 'Production Ready' : 'Needs Refinement',
    recommendations: {
      strengths: rec.strengths ?? [],
      risks: rec.risks ?? [],
      opportunities: rec.opportunities ?? [],
      suggestions: rec.suggestions ?? [],
      challengeReframes: rec.challengeReframes ?? [],
    },
    producerMemory: memory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function loadProducerReport(
  projectId: string,
  userId: string
): Promise<ProducerReport | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('producer_reports')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return rowToReport(data as ProducerReportRow)
}

export async function upsertProducerReport(
  projectId: string,
  userId: string,
  report: Omit<ProducerReport, 'createdAt' | 'updatedAt'>
): Promise<{ data: ProducerReport | null; error: Error | null }> {
  const supabase = createSupabaseServerClient()
  const now = new Date().toISOString()

  const row = {
    id: report.id,
    project_id: projectId,
    user_id: userId,
    story_score: report.scores.storyStrength,
    audience_score: report.scores.audienceFit,
    emotion_score: report.scores.emotionalImpact,
    visual_score: report.scores.visualPotential,
    retention_score: report.scores.retention,
    shareability_score: report.scores.shareability,
    cinematic_score: report.scores.cinematicQuality,
    curiosity_score: report.scores.curiosity,
    story_readiness_score: report.storyReadinessScore,
    production_ready: report.productionReady,
    recommendations: report.recommendations,
    producer_memory: report.producerMemory ?? EMPTY_PRODUCER_MEMORY,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('producer_reports')
    .upsert(row, { onConflict: 'project_id' })
    .select('*')
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: rowToReport(data as ProducerReportRow), error: null }
}

export async function updateProducerReportMemory(
  reportId: string,
  userId: string,
  memory: ProducerMemory
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('producer_reports')
    .update({ producer_memory: memory, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('user_id', userId)

  return { error: error ? new Error(error.message) : null }
}

export async function loadCreatorProducerMemory(userId: string): Promise<ProducerMemory> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('creator_memories')
    .select('producer_memory')
    .eq('user_id', userId)
    .maybeSingle()

  return parseProducerMemory(data?.producer_memory)
}

export async function upsertCreatorProducerMemory(
  userId: string,
  memory: ProducerMemory
): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('creator_memories')
    .select('id, producer_memory')
    .eq('user_id', userId)
    .maybeSingle()

  const merged = aggregateProducerMemory(
    parseProducerMemory(existing?.producer_memory),
    memory
  )

  if (existing?.id) {
    await supabase
      .from('creator_memories')
      .update({ producer_memory: merged, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  } else {
    await supabase.from('creator_memories').insert({
      user_id: userId,
      producer_memory: merged,
    })
  }
}

export async function setProducerApproved(
  projectId: string,
  userId: string,
  approved: boolean
): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { data: prev } = await supabase
    .from('director_project_state')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  await supabase.from('director_project_state').upsert(
    {
      project_id: projectId,
      user_id: userId,
      director_approved: prev?.director_approved ?? false,
      blueprint_locked: prev?.blueprint_locked ?? false,
      stage_progress: prev?.stage_progress ?? {},
      blueprint: prev?.blueprint ?? null,
      storyboard_plan: prev?.storyboard_plan ?? null,
      story_director_package: prev?.story_director_package ?? null,
      framework_recommendations: prev?.framework_recommendations ?? [],
      active_framework_id: prev?.active_framework_id ?? null,
      framework_analysis: prev?.framework_analysis ?? null,
      producer_approved: approved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' }
  )
}

export async function loadProducerApproved(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('director_project_state')
    .select('producer_approved')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  return data?.producer_approved ?? false
}
