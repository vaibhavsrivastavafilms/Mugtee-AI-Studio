import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOrCreateCreatorMemory } from '@/lib/director/memory/creator-memory.server'
import type { ProducerReport } from '@/lib/director/producer/types'
import { parseProducerMemory } from '@/lib/director/producer/producer-memory'
import { normalizeCreatorDna } from '@/lib/memory/creator-memory-engine'
import type { IntelligenceSourceBundle } from '@/lib/intelligence/types'

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

function rowToProducerReport(row: ProducerReportRow): ProducerReport {
  const rec = (row.recommendations ?? {}) as ProducerReport['recommendations']
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
    productionReady: row.production_ready,
    readinessLabel: row.production_ready ? 'Production Ready' : 'Needs Refinement',
    recommendations: {
      strengths: rec.strengths ?? [],
      risks: rec.risks ?? [],
      opportunities: rec.opportunities ?? [],
      suggestions: rec.suggestions ?? [],
      challengeReframes: rec.challengeReframes ?? [],
    },
    producerMemory: parseProducerMemory(row.producer_memory),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Aggregate intelligence inputs from existing tables — no duplicate learning logic. */
export async function loadIntelligenceSources(userId: string): Promise<IntelligenceSourceBundle> {
  const supabase = createSupabaseServerClient()

  const [creatorMemory, producerRes, frameworksRes, projectsRes, profileRes] = await Promise.all([
    getOrCreateCreatorMemory(userId),
    supabase
      .from('producer_reports')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50),
    supabase
      .from('story_frameworks')
      .select('project_id, framework_name, confidence_score, is_active, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('cinematic_projects')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50),
    supabase
      .from('creator_profiles')
      .select('niche, platform, content_style, creator_dna')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const projectIds = (projectsRes.data ?? []).map((p) => p.id as string)
  let approvedSet = new Set<string>()

  if (projectIds.length) {
    const { data: states } = await supabase
      .from('director_project_state')
      .select('project_id, director_approved')
      .in('project_id', projectIds)
      .eq('user_id', userId)

    approvedSet = new Set(
      (states ?? [])
        .filter((s) => s.director_approved)
        .map((s) => s.project_id as string)
    )
  }

  const producerReports = (producerRes.data ?? []).map((r) =>
    rowToProducerReport(r as ProducerReportRow)
  )

  const storyFrameworks = (frameworksRes.data ?? []).map((f) => ({
    projectId: f.project_id as string,
    frameworkName: f.framework_name as string,
    confidenceScore: Number(f.confidence_score ?? 0),
    isActive: Boolean(f.is_active),
    updatedAt: f.updated_at as string,
  }))

  const directorProjects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    title: (p.title as string) || 'Untitled',
    directorApproved: approvedSet.has(p.id as string),
    updatedAt: p.updated_at as string,
  }))

  const creatorDna = normalizeCreatorDna(profileRes.data?.creator_dna)

  return {
    creatorMemory,
    producerReports,
    storyFrameworks,
    directorProjects,
    creatorDna,
    profileMeta: {
      niche: profileRes.data?.niche ?? null,
      platform: profileRes.data?.platform ?? null,
      contentStyle: profileRes.data?.content_style ?? null,
    },
  }
}
