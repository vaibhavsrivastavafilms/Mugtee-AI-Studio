import type { SupabaseClient } from '@supabase/supabase-js'
import { BUILTIN_MARKETPLACE_AGENTS } from '@/lib/marketplace/agent-registry'
import { getAgentRatingSummary } from '@/lib/marketplace/agent-rating'

export async function browseMarketplaceAgents(
  supabase: SupabaseClient,
  opts?: { category?: string }
) {
  let query = supabase
    .from('marketplace_agents')
    .select(
      'slug, name, description, category, pricing_model, price_cents, revenue_share_percent, manifest, is_published'
    )
    .eq('is_published', true)
    .order('name')

  if (opts?.category) query = query.eq('category', opts.category)

  const { data, error } = await query
  if (error) {
    return BUILTIN_MARKETPLACE_AGENTS.map((a) => ({
      slug: a.slug,
      name: a.name,
      description: a.description,
      category: a.category,
      pricing_model: a.pricingModel,
      price_cents: a.priceCents,
      revenue_share_percent: a.revenueSharePercent,
      manifest: a.manifest,
      ratings: { average: 0, count: 0 },
    }))
  }

  const agents = data ?? []
  const withRatings = await Promise.all(
    agents.map(async (row) => ({
      ...row,
      ratings: await getAgentRatingSummary(supabase, row.slug),
    }))
  )
  return withRatings
}

export async function listUserInstalledAgents(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('agent_installs')
    .select('id, agent_slug, status, installed_at, workspace_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  return data ?? []
}
