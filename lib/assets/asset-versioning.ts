import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssetVersion, VersionKind } from '@/lib/assets/types'

export async function listAssetVersions(
  supabase: SupabaseClient,
  userId: string,
  assetId: string
): Promise<AssetVersion[]> {
  const { data } = await supabase
    .from('asset_versions')
    .select('id, asset_id, version_kind, label, snapshot, created_at')
    .eq('user_id', userId)
    .eq('asset_id', assetId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((r) => ({
    id: r.id,
    assetId: r.asset_id,
    versionKind: r.version_kind as VersionKind,
    label: r.label,
    snapshot: (r.snapshot ?? {}) as Record<string, unknown>,
    createdAt: r.created_at,
  }))
}

export async function createAssetVersion(
  supabase: SupabaseClient,
  userId: string,
  input: {
    assetId: string
    versionKind: VersionKind
    label?: string
    snapshot?: Record<string, unknown>
  }
): Promise<AssetVersion | null> {
  const { data, error } = await supabase
    .from('asset_versions')
    .insert({
      user_id: userId,
      asset_id: input.assetId,
      version_kind: input.versionKind,
      label: input.label ?? null,
      snapshot: input.snapshot ?? {},
    })
    .select('id, asset_id, version_kind, label, snapshot, created_at')
    .single()

  if (error || !data) return null

  await supabase
    .from('creative_assets')
    .update({ current_version_id: data.id, updated_at: new Date().toISOString() })
    .eq('id', input.assetId)
    .eq('user_id', userId)

  return {
    id: data.id,
    assetId: data.asset_id,
    versionKind: data.version_kind as VersionKind,
    label: data.label,
    snapshot: (data.snapshot ?? {}) as Record<string, unknown>,
    createdAt: data.created_at,
  }
}

/** Stub for regen flows — creates regenerated version snapshot without duplicating blobs */
export async function createUpdatedVersionStub(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
  opts?: { label?: string; snapshot?: Record<string, unknown> }
): Promise<AssetVersion | null> {
  const { data: asset } = await supabase
    .from('creative_assets')
    .select('id, title, type, metadata, source_type, source_id')
    .eq('id', assetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!asset) return null

  return createAssetVersion(supabase, userId, {
    assetId,
    versionKind: 'regenerated',
    label: opts?.label ?? `Regenerated ${asset.title}`,
    snapshot: {
      ...(asset.metadata as Record<string, unknown>),
      ...opts?.snapshot,
      sourceType: asset.source_type,
      sourceId: asset.source_id,
      stub: true,
    },
  })
}
