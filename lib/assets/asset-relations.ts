import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssetRelationEdge, RelationType } from '@/lib/assets/types'

export async function linkAssets(
  supabase: SupabaseClient,
  userId: string,
  parentId: string,
  childId: string,
  relationType: RelationType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from('asset_relations').upsert(
    {
      user_id: userId,
      parent_id: parentId,
      child_id: childId,
      relation_type: relationType,
      metadata: metadata ?? {},
    },
    { onConflict: 'user_id,parent_id,child_id,relation_type' }
  )
}

export async function getAssetGraph(
  supabase: SupabaseClient,
  userId: string,
  rootAssetId: string
): Promise<AssetRelationEdge[]> {
  const { data: edges } = await supabase
    .from('asset_relations')
    .select('id, parent_id, child_id, relation_type')
    .eq('user_id', userId)
    .or(`parent_id.eq.${rootAssetId},child_id.eq.${rootAssetId}`)

  const ids = new Set<string>()
  for (const e of edges ?? []) {
    ids.add(e.parent_id)
    ids.add(e.child_id)
  }

  const titles = new Map<string, string>()
  if (ids.size) {
    const { data: assets } = await supabase
      .from('creative_assets')
      .select('id, title')
      .eq('user_id', userId)
      .in('id', [...ids])
    for (const a of assets ?? []) titles.set(a.id, a.title)
  }

  return (edges ?? []).map((e) => ({
    id: e.id,
    parentId: e.parent_id,
    childId: e.child_id,
    relationType: e.relation_type as RelationType,
    parentTitle: titles.get(e.parent_id),
    childTitle: titles.get(e.child_id),
  }))
}

/** Build default pipeline relations for a cinematic project */
export async function ensureProjectPipelineRelations(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  assetIds: {
    campaign?: string
    script?: string
    storyboard?: string
    voice?: string
    thumbnail?: string
    export?: string
  }
): Promise<void> {
  const { campaign, script, storyboard, voice, thumbnail, export: exp } = assetIds
  if (campaign && script) await linkAssets(supabase, userId, campaign, script, 'campaign_contains')
  if (script && storyboard) await linkAssets(supabase, userId, script, storyboard, 'storyboard_from')
  if (storyboard && voice) await linkAssets(supabase, userId, storyboard, voice, 'voice_for')
  if (voice && thumbnail) await linkAssets(supabase, userId, voice, thumbnail, 'thumbnail_for')
  if (thumbnail && exp) await linkAssets(supabase, userId, thumbnail, exp, 'export_of')
  void projectId
}
