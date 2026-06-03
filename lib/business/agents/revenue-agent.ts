import type { SupabaseClient } from '@supabase/supabase-js'
import { analyzeMonetization } from '@/lib/business/revenue-engine'

export async function runRevenueAgent(input: { supabase: SupabaseClient; userId: string }) {
  const analysis = await analyzeMonetization(input.supabase, input.userId)
  return {
    role: 'RevenueAgent' as const,
    revenueInr: analysis.revenueInr,
    offers: analysis.offers,
    monetizationAnalysis: analysis.recommendations,
    suggestions: [
      analysis.offers.length === 0
        ? 'Create one flagship ₹ offer in Business Twin'
        : `Promote "${analysis.offers[0]?.name}" in next 3 exports`,
      analysis.revenueInr === 0
        ? 'Log first revenue event when a lead converts'
        : `Upsell — ₹${analysis.revenueInr.toLocaleString('en-IN')} logged; test bundle pricing`,
    ],
  }
}
