import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreatorDecision, DecisionHistoryEntry } from '@/lib/decision/types'

const MAX_HISTORY = 40

export async function appendDecisionHistory(
  supabase: SupabaseClient,
  userId: string,
  entry: DecisionHistoryEntry
): Promise<void> {
  const { data } = await supabase
    .from('creator_profiles')
    .select('decision_history')
    .eq('user_id', userId)
    .maybeSingle()

  const existing = Array.isArray(data?.decision_history)
    ? (data!.decision_history as DecisionHistoryEntry[])
    : []

  const next = [...existing, entry].slice(-MAX_HISTORY)

  const row = await supabase
    .from('creator_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (row.data) {
    await supabase
      .from('creator_profiles')
      .update({ decision_history: next })
      .eq('user_id', userId)
  } else {
    await supabase.from('creator_profiles').insert({
      user_id: userId,
      decision_history: next,
    })
  }
}

export async function logDecisionShown(
  supabase: SupabaseClient,
  userId: string,
  decision: CreatorDecision
): Promise<void> {
  const p = decision.recommendedProject
  const payload = {
    topic: p.topic,
    title: p.title,
    format: p.format,
    platform: p.platform,
    opportunityScore: decision.opportunityScore,
    confidenceScore: decision.confidenceScore,
    reasoningSummary: decision.reasoningSummary,
    expectedImpact: decision.expectedImpact,
  }

  await supabase.from('creator_events').insert({
    user_id: userId,
    event_type: 'decision_shown',
    payload,
  })

  await appendDecisionHistory(supabase, userId, {
    at: new Date().toISOString(),
    event: 'decision_shown',
    topic: p.topic,
    title: p.title,
    opportunityScore: decision.opportunityScore,
    confidenceScore: decision.confidenceScore,
    format: p.format,
    platform: p.platform,
  })
}

export async function logDecisionAccepted(
  supabase: SupabaseClient,
  userId: string,
  input: {
    topic: string
    title?: string
    format?: string
    platform?: string
    opportunityScore?: number
    confidenceScore?: number
  }
): Promise<void> {
  const payload = {
    topic: input.topic.slice(0, 120),
    title: (input.title ?? input.topic).slice(0, 120),
    format: input.format,
    platform: input.platform,
    opportunityScore: input.opportunityScore,
    confidenceScore: input.confidenceScore,
  }

  await supabase.from('creator_events').insert({
    user_id: userId,
    event_type: 'decision_accepted',
    payload,
  })

  await appendDecisionHistory(supabase, userId, {
    at: new Date().toISOString(),
    event: 'decision_accepted',
    topic: payload.topic,
    title: payload.title,
    opportunityScore: input.opportunityScore ?? 0,
    confidenceScore: input.confidenceScore ?? 0,
    format: input.format,
    platform: input.platform,
  })
}
