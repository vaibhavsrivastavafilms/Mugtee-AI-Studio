import type { SupabaseClient } from '@supabase/supabase-js'
import { embedText, searchMemoryEmbeddings, cosineSimilarity } from '@/lib/memory/memory-embeddings'
import {
  rowToAsset,
  type Asset,
  type AssetSearchFilters,
  type AssetSearchResult,
  type CreativeAssetRow,
} from '@/lib/assets/types'

function escapeIlike(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&').slice(0, 200)
}

export async function searchAssetsKeyword(
  supabase: SupabaseClient,
  userId: string,
  filters: AssetSearchFilters
): Promise<Asset[]> {
  const limit = Math.min(100, Math.max(1, filters.limit ?? 40))
  let q = supabase
    .from('creative_assets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (filters.brand) q = q.eq('brand_id', filters.brand)
  if (filters.project) q = q.eq('project_id', filters.project)
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type]
    q = q.in('type', types)
  }
  if (filters.from) q = q.gte('created_at', filters.from)
  if (filters.to) q = q.lte('created_at', filters.to)
  if (filters.tags?.length) q = q.overlaps('tags', filters.tags)

  const term = filters.q?.trim()
  if (term) {
    const safe = escapeIlike(term)
    q = q.or(
      `title.ilike.%${safe}%,description.ilike.%${safe}%,metadata->>niche.ilike.%${safe}%`
    )
  }

  const { data } = await q
  return (data ?? []).map((r) => rowToAsset(r as CreativeAssetRow))
}

export async function searchAssetsSemantic(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  opts?: { brandId?: string; limit?: number }
): Promise<Asset[]> {
  const embedding = await embedText(query)
  if (!embedding) return searchAssetsKeyword(supabase, userId, { q: query, limit: opts?.limit })

  const hits = await searchMemoryEmbeddings(supabase, userId, embedding, opts?.limit ?? 12)
  const assetIds = hits
    .filter((h) => h.sourceType === 'creative_asset')
    .map((h) => h.sourceId)

  if (!assetIds.length) {
    return searchAssetsKeyword(supabase, userId, { q: query, limit: opts?.limit })
  }

  let q = supabase.from('creative_assets').select('*').eq('user_id', userId).in('id', assetIds)
  if (opts?.brandId) q = q.eq('brand_id', opts.brandId)
  const { data } = await q
  const byId = new Map((data ?? []).map((r) => [r.id, rowToAsset(r as CreativeAssetRow)]))
  return assetIds.map((id) => byId.get(id)).filter((a): a is Asset => !!a)
}

export async function findDuplicateCandidates(
  supabase: SupabaseClient,
  userId: string,
  asset: Asset
): Promise<Array<{ assetId: string; similarId: string; score: number }>> {
  const dupes: Array<{ assetId: string; similarId: string; score: number }> = []

  if (asset.contentHash) {
    const { data } = await supabase
      .from('creative_assets')
      .select('id, title, tags')
      .eq('user_id', userId)
      .eq('content_hash', asset.contentHash)
      .neq('id', asset.id)
      .limit(5)
    for (const row of data ?? []) {
      dupes.push({ assetId: asset.id, similarId: row.id, score: 1 })
    }
  }

  const preview = [asset.title, ...asset.tags].join(' ')
  const embedding = await embedText(preview)
  if (embedding) {
    const { data } = await supabase
      .from('memory_embeddings')
      .select('source_id, embedding, text_preview')
      .eq('user_id', userId)
      .eq('source_type', 'creative_asset')
      .neq('source_id', asset.id)
      .limit(40)

    for (const row of data ?? []) {
      const emb = row.embedding as unknown
      if (!Array.isArray(emb)) continue
      const vec = emb.filter((n): n is number => typeof n === 'number')
      if (vec.length !== embedding.length) continue
      const score = cosineSimilarity(embedding, vec)
      if (score >= 0.92) {
        dupes.push({ assetId: asset.id, similarId: String(row.source_id), score })
      }
    }
  }

  return dupes
}

export async function searchAssets(
  supabase: SupabaseClient,
  userId: string,
  filters: AssetSearchFilters & { semantic?: boolean }
): Promise<AssetSearchResult> {
  const assets =
    filters.semantic && filters.q
      ? await searchAssetsSemantic(supabase, userId, filters.q, {
          brandId: filters.brand,
          limit: filters.limit,
        })
      : await searchAssetsKeyword(supabase, userId, filters)

  const duplicates: AssetSearchResult['duplicates'] = []
  if (assets[0]) {
    const d = await findDuplicateCandidates(supabase, userId, assets[0])
    duplicates.push(...d)
  }

  return { assets, duplicates }
}

/** Resolve brand slug (e.g. table-tales) to brand_profiles.id */
export async function resolveBrandId(
  supabase: SupabaseClient,
  userId: string,
  brand: string
): Promise<string | null> {
  const slug = brand.toLowerCase().replace(/\s+/g, '-')
  const { data } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('user_id', userId)
    .or(`slug.eq.${slug},display_name.ilike.%${escapeIlike(brand)}%`)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}
