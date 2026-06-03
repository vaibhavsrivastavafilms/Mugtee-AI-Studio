import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusinessLead } from '@/lib/business/types'
import { nurtureLeads, scoreLead } from '@/lib/business/lead-engine'

export function runLeadAgent(input: {
  supabase: SupabaseClient
  userId: string
  leads: BusinessLead[]
}) {
  return {
    role: 'LeadAgent' as const,
    capture: 'Use content drops and CTAs to create leads with source_content_id',
    scoring: input.leads.map((l) => ({
      id: l.id,
      score: l.score,
      status: l.status,
      hint:
        l.score < 50
          ? 'Move to consideration content'
          : 'Ready for nurture sequence',
    })),
    opportunities: input.leads.filter((l) => l.score >= 60).slice(0, 5),
    nurture: () => nurtureLeads(input.supabase, input.userId),
    scoreLead,
  }
}
