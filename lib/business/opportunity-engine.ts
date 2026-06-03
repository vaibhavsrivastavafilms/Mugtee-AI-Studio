import type { SupabaseClient } from '@supabase/supabase-js'
import type { GrowthRecommendation } from '@/lib/business/types'
import { topOpportunities } from '@/lib/business/lead-engine'
import { analyzeMonetization } from '@/lib/business/revenue-engine'
import { runMemoryEngine } from '@/lib/memory/memory-engine'

export type BusinessOpportunity = {
  title: string
  category: 'trend' | 'gap' | 'partnership'
  description: string
  impact: 'high' | 'medium' | 'low'
}

export async function detectOpportunities(
  supabase: SupabaseClient,
  userId: string,
  goal?: string
): Promise<BusinessOpportunity[]> {
  const g = goal ?? 'grow audience and revenue'
  const [{ bundle }, leads, monetization] = await Promise.all([
    runMemoryEngine(supabase, userId, g).catch(() => ({
      bundle: { profile: { preferences: { niche: 'creator' } } },
    })),
    topOpportunities(supabase, userId, 3),
    analyzeMonetization(supabase, userId),
  ])

  const niche = bundle.profile?.preferences?.niche ?? 'your space'
  const ops: BusinessOpportunity[] = [
    {
      title: `${niche} trend window`,
      category: 'trend',
      description: `Short-form hooks in ${niche} are peaking — ship 2 reels this week while attention is high.`,
      impact: 'high',
    },
  ]

  if (monetization.offers.length === 0) {
    ops.push({
      title: 'Monetization gap — no priced offer',
      category: 'gap',
      description: 'Content is working but nothing is for sale. Add one offer to twin and CTA every export.',
      impact: 'high',
    })
  }

  if (leads.length >= 2) {
    ops.push({
      title: 'Partnership — co-create with top lead segment',
      category: 'partnership',
      description: `${leads.length} warm leads — invite one to a collab reel or live session.`,
      impact: 'medium',
    })
  }

  return ops.slice(0, 5)
}

export function opportunitiesToRecommendations(
  ops: BusinessOpportunity[]
): GrowthRecommendation[] {
  return ops.map((o) => ({
    title: o.title,
    description: o.description,
    funnelStage: o.category === 'gap' ? 'conversion' : 'awareness',
    impact: o.impact,
  }))
}
