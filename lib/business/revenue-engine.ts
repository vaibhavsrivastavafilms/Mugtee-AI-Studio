import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusinessOffer, GrowthRecommendation } from '@/lib/business/types'
import { getOrCreateBusinessTwin, listRevenueEvents, updateBusinessTwin } from '@/lib/business/business-memory'

export async function totalRevenueInr(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const events = await listRevenueEvents(supabase, userId, 200)
  return events.reduce((sum, e) => sum + e.amountInr, 0)
}

export async function analyzeMonetization(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  revenueInr: number
  offers: BusinessOffer[]
  recommendations: GrowthRecommendation[]
}> {
  const twin = await getOrCreateBusinessTwin(supabase, userId)
  const revenueInr = await totalRevenueInr(supabase, userId)
  const offers = [...twin.model.offers, ...twin.model.services, ...twin.model.products]

  const recommendations: GrowthRecommendation[] = []
  if (offers.length === 0) {
    recommendations.push({
      title: 'Define a flagship offer',
      description: 'Add one clear ₹-priced offer to your business twin — anchor all content CTAs to it.',
      funnelStage: 'conversion',
      impact: 'high',
    })
  }
  if (revenueInr === 0) {
    recommendations.push({
      title: 'Track first revenue event',
      description: 'Log a sale or booking when your next lead converts — unlocks revenue funnel metrics.',
      funnelStage: 'conversion',
      impact: 'high',
    })
  } else if (revenueInr < 50000) {
    recommendations.push({
      title: 'Bundle offer + content series',
      description: `You've logged ₹${revenueInr.toLocaleString('en-IN')} — test a 3-part consideration funnel leading to checkout.`,
      funnelStage: 'consideration',
      impact: 'medium',
    })
  }

  await updateBusinessTwin(supabase, userId, twin.id, {
    metrics: { ...twin.metrics, revenueInr, lastSyncedAt: new Date().toISOString() },
  })

  return { revenueInr, offers, recommendations }
}

export async function recordRevenue(
  supabase: SupabaseClient,
  userId: string,
  input: {
    amountInr: number
    eventType?: 'sale' | 'booking' | 'subscription' | 'tip' | 'other'
    leadId?: string | null
    description?: string
  }
): Promise<void> {
  await supabase.from('business_revenue_events').insert({
    user_id: userId,
    lead_id: input.leadId ?? null,
    amount_inr: input.amountInr,
    event_type: input.eventType ?? 'sale',
    description: input.description ?? null,
  })
}
