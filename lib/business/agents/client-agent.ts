import type { SupabaseClient } from '@supabase/supabase-js'
import { listLeads } from '@/lib/business/business-memory'

export async function runClientAgent(input: { supabase: SupabaseClient; userId: string }) {
  const leads = await listLeads(input.supabase, input.userId, 15)
  const qualified = leads.filter((l) => l.status === 'qualified' || l.score >= 70)

  return {
    role: 'ClientAgent' as const,
    proposals: qualified.slice(0, 3).map((l) => ({
      leadId: l.id,
      title: `Proposal for ${l.contact.name ?? 'prospect'}`,
      steps: ['Send deck', 'Book call', 'Send ₹ quote'],
    })),
    onboarding: [
      'Welcome packet + brand guidelines',
      'First deliverable milestone in 7 days',
    ],
    followUps: leads
      .filter((l) => l.status === 'nurturing')
      .slice(0, 5)
      .map((l) => ({
        leadId: l.id,
        action: `Follow up — score ${l.score}`,
        dueInDays: 2,
      })),
  }
}
