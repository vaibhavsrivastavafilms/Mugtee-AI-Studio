import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusinessLead, FunnelStage } from '@/lib/business/types'
import { insertLead, listLeads } from '@/lib/business/business-memory'

export function scoreLead(input: {
  funnelStage: FunnelStage
  hasEmail?: boolean
  hasPhone?: boolean
  engagementScore?: number
  repeatVisit?: boolean
}): number {
  let score = 20
  const stageBoost: Record<FunnelStage, number> = {
    awareness: 10,
    consideration: 25,
    conversion: 40,
    retention: 35,
  }
  score += stageBoost[input.funnelStage] ?? 10
  if (input.hasEmail) score += 15
  if (input.hasPhone) score += 10
  if (input.engagementScore) score += Math.min(25, Math.round(input.engagementScore / 4))
  if (input.repeatVisit) score += 10
  return Math.min(100, Math.max(0, score))
}

export async function captureLeadFromContent(
  supabase: SupabaseClient,
  userId: string,
  input: {
    projectId?: string
    contentAssetId?: string
    funnelStage?: FunnelStage
    contact?: Record<string, unknown>
    engagementScore?: number
  }
): Promise<BusinessLead> {
  const funnelStage = input.funnelStage ?? 'consideration'
  const score = scoreLead({
    funnelStage,
    hasEmail: Boolean(input.contact?.email),
    hasPhone: Boolean(input.contact?.phone),
    engagementScore: input.engagementScore,
  })
  return insertLead(supabase, userId, {
    projectId: input.projectId ?? null,
    sourceContentId: input.contentAssetId ?? null,
    funnelStage,
    score,
    contact: input.contact ?? {},
    metadata: { source: 'content_drop', engagementScore: input.engagementScore ?? 0 },
  })
}

export async function nurtureLeads(
  supabase: SupabaseClient,
  userId: string
): Promise<{ leads: BusinessLead[]; actions: string[] }> {
  const leads = await listLeads(supabase, userId, 20)
  const actions: string[] = []

  for (const lead of leads.filter((l) => l.status === 'new' && l.score >= 50)) {
    await supabase
      .from('business_leads')
      .update({ status: 'nurturing', updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('user_id', userId)
    actions.push(`Nurture lead ${lead.id.slice(0, 8)} — score ${lead.score}`)
  }

  return { leads: await listLeads(supabase, userId, 20), actions }
}

export async function topOpportunities(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<BusinessLead[]> {
  const leads = await listLeads(supabase, userId, limit * 2)
  return leads
    .filter((l) => l.status !== 'lost' && l.status !== 'won')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
