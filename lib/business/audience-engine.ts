import type { SupabaseClient } from '@supabase/supabase-js'
import type { AudienceSegment, FunnelStage, GrowthRecommendation } from '@/lib/business/types'
import { listAudienceSegments } from '@/lib/business/business-memory'
import { runMemoryEngine } from '@/lib/memory/memory-engine'

const DEFAULT_SEGMENTS: Omit<AudienceSegment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    brandId: null,
    name: 'Cold reach — new followers',
    funnelStage: 'awareness',
    sizeEstimate: 0,
    attributes: { source: 'organic' },
  },
  {
    brandId: null,
    name: 'Engaged viewers — saves & shares',
    funnelStage: 'consideration',
    sizeEstimate: 0,
    attributes: { source: 'content' },
  },
  {
    brandId: null,
    name: 'DM / inquiry leads',
    funnelStage: 'conversion',
    sizeEstimate: 0,
    attributes: { source: 'inbound' },
  },
  {
    brandId: null,
    name: 'Repeat clients & subscribers',
    funnelStage: 'retention',
    sizeEstimate: 0,
    attributes: { source: 'crm' },
  },
]

export async function ensureDefaultAudienceSegments(
  supabase: SupabaseClient,
  userId: string
): Promise<AudienceSegment[]> {
  const existing = await listAudienceSegments(supabase, userId)
  if (existing.length >= 4) return existing

  for (const seg of DEFAULT_SEGMENTS) {
    if (existing.some((e) => e.name === seg.name)) continue
    await supabase.from('audience_segments').insert({
      user_id: userId,
      brand_id: seg.brandId,
      name: seg.name,
      funnel_stage: seg.funnelStage,
      size_estimate: seg.sizeEstimate,
      attributes: seg.attributes,
    })
  }
  return listAudienceSegments(supabase, userId)
}

export async function suggestAudienceExpansion(
  supabase: SupabaseClient,
  userId: string,
  goal: string
): Promise<GrowthRecommendation[]> {
  const segments = await ensureDefaultAudienceSegments(supabase, userId)
  const { bundle } = await runMemoryEngine(supabase, userId, goal).catch(() => ({
    bundle: { profile: { preferences: {} } },
  }))
  const prefs = bundle.profile?.preferences
  const niche =
    prefs && typeof prefs === 'object' && 'niche' in prefs && typeof prefs.niche === 'string'
      ? prefs.niche
      : 'your niche'
  const weakest = segments.sort((a, b) => a.sizeEstimate - b.sizeEstimate)[0]

  const recs: GrowthRecommendation[] = [
    {
      title: `Expand ${weakest?.name ?? 'awareness'} with a series`,
      description: `Three-part reel arc in ${niche} targeting ${weakest?.funnelStage ?? 'awareness'}.`,
      funnelStage: (weakest?.funnelStage ?? 'awareness') as FunnelStage,
      impact: 'high',
    },
    {
      title: 'Cross-post top asset to consideration',
      description: 'Repurpose highest-engagement export with a direct CTA slide.',
      funnelStage: 'consideration',
      impact: 'medium',
    },
  ]
  return recs
}
