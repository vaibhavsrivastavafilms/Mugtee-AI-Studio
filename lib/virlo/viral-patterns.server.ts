import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { aggregateMarketIntelligence } from '@/lib/virlo/market-intelligence'
import { SEED_VIRAL_PATTERNS } from '@/lib/virlo/seed-patterns'
import type { ViralPattern, VirloMarketIntelligence } from '@/lib/virlo/types'

type PatternRow = {
  id: string
  platform: string
  topic: string
  framework: string
  hook_type: string | null
  emotion: string | null
  curiosity_trigger: string | null
  retention_strategy: string | null
  shareability_score: number
  saveability_score: number
  virality_score: number
  story_quality_score: number
  framework_confidence: number
  source_url: string | null
  raw_analysis: Record<string, unknown>
  created_at: string
}

function rowToPattern(row: PatternRow): ViralPattern {
  return {
    id: row.id,
    platform: row.platform,
    topic: row.topic,
    framework: row.framework,
    hookType: row.hook_type,
    emotion: row.emotion,
    curiosityTrigger: row.curiosity_trigger,
    retentionStrategy: row.retention_strategy,
    shareabilityScore: row.shareability_score,
    saveabilityScore: row.saveability_score,
    viralityScore: row.virality_score,
    storyQualityScore: row.story_quality_score,
    frameworkConfidence: row.framework_confidence,
    sourceUrl: row.source_url,
    rawAnalysis: row.raw_analysis ?? {},
    createdAt: row.created_at,
  }
}

function seedFallbackPatterns(): ViralPattern[] {
  const now = new Date().toISOString()
  return SEED_VIRAL_PATTERNS.map((p, i) => ({
    id: `seed-${i}`,
    platform: p.platform,
    topic: p.topic,
    framework: p.framework,
    hookType: p.hook_type,
    emotion: p.emotion,
    curiosityTrigger: p.curiosity_trigger,
    retentionStrategy: p.retention_strategy,
    shareabilityScore: p.shareability_score,
    saveabilityScore: p.saveability_score,
    viralityScore: p.virality_score,
    storyQualityScore: p.story_quality_score,
    frameworkConfidence: p.framework_confidence,
    sourceUrl: null,
    rawAnalysis: p.raw_analysis as Record<string, unknown>,
    createdAt: now,
  }))
}

/** Load viral patterns from DB (falls back to in-memory seed). */
export async function loadViralPatterns(platform?: string): Promise<ViralPattern[]> {
  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('viral_patterns')
    .select('*')
    .order('virality_score', { ascending: false })
    .limit(100)

  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query

  if (error || !data?.length) {
    const fallback = seedFallbackPatterns()
    return platform ? fallback.filter((p) => p.platform === platform) : fallback
  }

  return (data as PatternRow[]).map(rowToPattern)
}

/** Aggregate market intelligence from stored patterns. */
export async function loadVirloMarketIntelligence(
  platform?: string | null
): Promise<VirloMarketIntelligence> {
  const patterns = await loadViralPatterns(platform ?? undefined)
  return aggregateMarketIntelligence(patterns, platform)
}

/** Insert seed patterns via service role (admin/dev tooling). */
export async function seedViralPatternsIfEmpty(): Promise<number> {
  const service = createSupabaseServiceClient()
  if (!service) return 0
  const { count } = await service
    .from('viral_patterns')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) return 0

  const rows = SEED_VIRAL_PATTERNS.map((p) => ({
    ...p,
    source_url: null,
    raw_analysis: p.raw_analysis,
  }))

  const { error } = await service.from('viral_patterns').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}
