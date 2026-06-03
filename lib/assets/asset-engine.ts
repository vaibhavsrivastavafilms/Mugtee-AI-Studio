import type { SupabaseClient } from '@supabase/supabase-js'
import { upsertCreativeAsset } from '@/lib/assets/asset-indexer'
import { reindexUserAssets } from '@/lib/assets/asset-indexer'
import { getAssetInsights } from '@/lib/assets/asset-insights'
import { getAssetGraph } from '@/lib/assets/asset-relations'
import { searchAssets, searchAssetsSemantic, resolveBrandId } from '@/lib/assets/asset-search'
import { callStructuredJson } from '@/lib/ai-agent/structured-llm'
import type { AssetSearchFilters } from '@/lib/assets/types'
import { listAssetVersions, createUpdatedVersionStub } from '@/lib/assets/asset-versioning'
import {
  rowToAsset,
  type Asset,
  type AssetInsight,
  type AssetSearchResult,
  type AssetType,
  type CreativeAssetRow,
} from '@/lib/assets/types'

export async function createCreativeAssetFromSource(
  supabase: SupabaseClient,
  userId: string,
  input: {
    type: AssetType
    title: string
    description?: string | null
    tags?: string[]
    projectId?: string | null
    sourceType: string
    sourceId: string
    metadata?: Record<string, unknown>
  }
): Promise<string | null> {
  return upsertCreativeAsset(supabase, userId, {
    ...input,
    indexEmbedding: true,
  })
}

export type AssetEngine = ReturnType<typeof createAssetEngine>

export function createAssetEngine(supabase: SupabaseClient, userId: string) {
  return {
    async ensureIndexed(): Promise<void> {
      await reindexUserAssets(supabase, userId)
    },

    async search(
      filters: AssetSearchFilters & { semantic?: boolean }
    ): Promise<AssetSearchResult> {
      let brandId = filters.brand
      if (filters.brand && !/^[0-9a-f-]{36}$/i.test(filters.brand)) {
        brandId = (await resolveBrandId(supabase, userId, filters.brand)) ?? undefined
      }
      return searchAssets(supabase, userId, { ...filters, brand: brandId })
    },

    async naturalLanguageSearch(
      query: string,
      opts?: { brand?: string }
    ): Promise<AssetSearchResult & { parsed?: AssetSearchFilters }> {
      let brandId: string | undefined
      if (opts?.brand) {
        brandId = (await resolveBrandId(supabase, userId, opts.brand)) ?? undefined
      }

      let structured: AssetSearchFilters = { q: query, limit: 30, brand: brandId }
      try {
        const parsed = await callStructuredJson<{
          keywords: string[]
          types: string[]
          brandHint: string | null
          campaignHint: string | null
        }>({
          system: 'Parse natural language asset search into structured filters for a creator studio.',
          user: query,
          schemaHint:
            '{"keywords":["string"],"types":["script|voiceover|storyboard|image|video|campaign|export"],"brandHint":"string|null","campaignHint":"string|null"}',
          max_tokens: 200,
        })
        structured = {
          q: [...(parsed.keywords ?? []), parsed.campaignHint].filter(Boolean).join(' ') || query,
          type: (parsed.types ?? []) as AssetSearchFilters['type'],
          limit: 30,
          brand: brandId,
        }
        if (parsed.brandHint) {
          structured.brand =
            (await resolveBrandId(supabase, userId, parsed.brandHint)) ?? brandId
        }
      } catch {
        structured = { q: query, limit: 30, brand: brandId }
      }

      const semantic = await searchAssetsSemantic(supabase, userId, query, {
        brandId: structured.brand,
        limit: structured.limit,
      })
      const keyword = (await searchAssets(supabase, userId, { ...structured, semantic: false }))
        .assets
      const seen = new Set<string>()
      const assets: Asset[] = []
      for (const a of [...semantic, ...keyword]) {
        if (seen.has(a.id)) continue
        seen.add(a.id)
        assets.push(a)
      }
      return { assets, parsed: structured }
    },

    async getAsset(assetId: string): Promise<Asset | null> {
      const { data } = await supabase
        .from('creative_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('id', assetId)
        .maybeSingle()
      return data ? rowToAsset(data as CreativeAssetRow) : null
    },

    async getGraph(assetId: string) {
      return getAssetGraph(supabase, userId, assetId)
    },

    async insights(assetId: string): Promise<AssetInsight | null> {
      const asset = await this.getAsset(assetId)
      if (!asset) return null
      return getAssetInsights(supabase, userId, asset)
    },

    async versions(assetId: string) {
      return listAssetVersions(supabase, userId, assetId)
    },

    async createUpdatedVersion(assetId: string) {
      return createUpdatedVersionStub(supabase, userId, assetId, {
        label: 'Regenerated via MugteeOS',
      })
    },
  }
}

export async function formatAssetContextForPrompt(
  supabase: SupabaseClient,
  userId: string,
  query: string
): Promise<string> {
  const engine = createAssetEngine(supabase, userId)
  const { assets } = await engine.search({ q: query, semantic: true, limit: 5 })
  if (!assets.length) return ''
  const lines = assets.map(
    (a) => `- [${a.type}] ${a.title}${a.project ? ` (project ${a.project.slice(0, 8)}…)` : ''}`
  )
  return ['RELEVANT CREATIVE ASSETS:', ...lines].join('\n')
}
