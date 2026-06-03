import type { SupabaseClient } from '@supabase/supabase-js'

export async function rateMarketplaceAgent(
  supabase: SupabaseClient,
  userId: string,
  agentSlug: string,
  rating: number,
  review?: string
) {
  if (rating < 1 || rating > 5) throw new Error('Rating must be 1–5')

  const { data, error } = await supabase
    .from('agent_ratings')
    .upsert(
      {
        user_id: userId,
        agent_slug: agentSlug,
        rating,
        review: review?.slice(0, 2000) ?? null,
      },
      { onConflict: 'user_id,agent_slug' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getAgentRatingSummary(
  supabase: SupabaseClient,
  agentSlug: string
) {
  const { data } = await supabase
    .from('agent_ratings')
    .select('rating')
    .eq('agent_slug', agentSlug)

  const ratings = (data ?? []).map((r) => r.rating as number)
  if (!ratings.length) return { average: 0, count: 0 }
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
  return { average: Math.round(average * 10) / 10, count: ratings.length }
}
