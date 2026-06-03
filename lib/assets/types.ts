/** Universal Creative Asset model — MugteeOS Phase 4 */

export const ASSET_TYPES = [
  'script',
  'voiceover',
  'storyboard',
  'image',
  'video',
  'campaign',
  'calendar',
  'document',
  'brand_asset',
  'template',
  'export',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]

export const RELATION_TYPES = [
  'campaign_contains',
  'script_for',
  'storyboard_from',
  'voice_for',
  'thumbnail_for',
  'export_of',
  'derived_from',
  'related',
] as const

export type RelationType = (typeof RELATION_TYPES)[number]

export const VERSION_KINDS = ['original', 'edited', 'regenerated', 'published'] as const
export type VersionKind = (typeof VERSION_KINDS)[number]

export type Asset = {
  id: string
  type: AssetType
  title: string
  description: string | null
  tags: string[]
  creator: string
  brand: string | null
  project: string | null
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
  sourceType?: string
  sourceId?: string
  contentHash?: string | null
}

export type AssetRelationEdge = {
  id: string
  parentId: string
  childId: string
  relationType: RelationType
  parentTitle?: string
  childTitle?: string
}

export type AssetVersion = {
  id: string
  assetId: string
  versionKind: VersionKind
  label: string | null
  snapshot: Record<string, unknown>
  createdAt: string
}

export type AssetSearchFilters = {
  q?: string
  brand?: string
  project?: string
  type?: AssetType | AssetType[]
  tags?: string[]
  from?: string
  to?: string
  limit?: number
}

export type AssetSearchResult = {
  assets: Asset[]
  relations?: AssetRelationEdge[]
  duplicates?: Array<{ assetId: string; similarId: string; score: number }>
}

export type AssetInsight = {
  assetId: string
  healthScore: number
  recommendations: string[]
  unused?: boolean
  repurposingOpportunity?: string
}

export type CreativeAssetRow = {
  id: string
  user_id: string
  type: string
  title: string
  description: string | null
  tags: string[] | null
  brand_id: string | null
  project_id: string | null
  source_type: string
  source_id: string
  content_hash: string | null
  metadata: Record<string, unknown> | null
  current_version_id: string | null
  created_at: string
  updated_at: string
}

export function rowToAsset(row: CreativeAssetRow): Asset {
  return {
    id: row.id,
    type: row.type as AssetType,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    creator: row.user_id,
    brand: row.brand_id,
    project: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    sourceType: row.source_type,
    sourceId: row.source_id,
    contentHash: row.content_hash,
  }
}

/** Map legacy project_assets.kind → universal AssetType */
export function projectAssetKindToType(kind: string): AssetType {
  const map: Record<string, AssetType> = {
    image: 'image',
    voiceover: 'voiceover',
    video: 'video',
    music: 'brand_asset',
    export: 'export',
    prompt: 'script',
  }
  return map[kind] ?? 'document'
}
