import type { SupabaseClient } from '@supabase/supabase-js'
import { rowToAsset, type Asset, type AssetInsight, type CreativeAssetRow } from '@/lib/assets/types'

const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000

export function computeAssetHealthScore(asset: Asset, relationCount: number): number {
  let score = 50
  if (asset.title && asset.title.length > 3) score += 10
  if (asset.description?.trim()) score += 10
  if (asset.tags.length >= 2) score += 10
  if (asset.project) score += 10
  if (relationCount > 0) score += Math.min(15, relationCount * 5)
  const age = Date.now() - new Date(asset.updatedAt).getTime()
  if (age < MS_30_DAYS) score += 5
  return Math.min(100, score)
}

export async function getAssetInsights(
  supabase: SupabaseClient,
  userId: string,
  asset: Asset
): Promise<AssetInsight> {
  const { count } = await supabase
    .from('asset_relations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or(`parent_id.eq.${asset.id},child_id.eq.${asset.id}`)

  const relationCount = count ?? 0
  const healthScore = computeAssetHealthScore(asset, relationCount)
  const recommendations: string[] = []
  const updated = new Date(asset.updatedAt).getTime()
  const unused = Date.now() - updated > MS_30_DAYS && relationCount === 0

  if (!asset.tags.length) recommendations.push('Add tags or run auto-tag for discoverability')
  if (!asset.description?.trim() && asset.type === 'script') {
    recommendations.push('Add a short description summarizing the hook')
  }
  if (relationCount === 0 && asset.type === 'campaign') {
    recommendations.push('Link script and storyboard assets to complete the pipeline graph')
  }
  if (unused) recommendations.push('This asset has not been updated recently — consider repurposing in a new reel')

  let repurposingOpportunity: string | undefined
  if (asset.type === 'script' || asset.type === 'storyboard') {
    repurposingOpportunity = 'Reuse beats as a new hook variant or cross-post to another platform'
  } else if (asset.type === 'image') {
    repurposingOpportunity = 'Use as thumbnail or B-roll in an upcoming campaign'
  }

  return {
    assetId: asset.id,
    healthScore,
    recommendations,
    unused,
    repurposingOpportunity,
  }
}

export async function getPortfolioRecommendations(
  supabase: SupabaseClient,
  userId: string,
  limit = 8
): Promise<AssetInsight[]> {
  const { data } = await supabase
    .from('creative_assets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .limit(limit * 3)

  const insights: AssetInsight[] = []
  for (const row of data ?? []) {
    const asset = rowToAsset(row as CreativeAssetRow)
    const insight = await getAssetInsights(supabase, userId, asset)
    if (insight.unused || insight.healthScore < 60) insights.push(insight)
    if (insights.length >= limit) break
  }
  return insights
}
