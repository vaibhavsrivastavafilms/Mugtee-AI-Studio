import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { PROJECT_ASSETS_BUCKET } from '@/lib/storage/constants'
import { requireSupabaseServiceClient } from '@/lib/storage/service-client.server'

export type ProjectAssetRow = {
  id: string
  project_id: string
  user_id: string
  kind: string
  url: string | null
  storage_path: string | null
  bucket: string | null
  mime_type: string | null
  scene_id: string | null
  sha256: string | null
  file_size: number | null
  deleted_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function findDuplicateSceneAsset(params: {
  projectId: string
  sceneId: string
  sha256: string
  supabase?: SupabaseClient
}): Promise<ProjectAssetRow | null> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const { data } = await supabase
    .from('project_assets')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('scene_id', params.sceneId)
    .eq('kind', 'image')
    .eq('sha256', params.sha256)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as ProjectAssetRow | null) ?? null
}

export async function createSceneImageAsset(params: {
  userId: string
  projectId: string
  sceneId: string
  storagePath: string
  bucket?: string
  sha256: string
  fileSize: number
  mimeType?: string
  prompt?: string | null
  title?: string | null
  sequenceIndex?: number
  metadata?: Record<string, unknown>
  supabase?: SupabaseClient
}): Promise<ProjectAssetRow> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const bucket = params.bucket ?? PROJECT_ASSETS_BUCKET
  const metadata: Record<string, unknown> = {
    ...(params.metadata ?? {}),
    scene_id: params.sceneId,
    ...(params.sequenceIndex != null ? { sequence_index: params.sequenceIndex } : {}),
    source: params.metadata?.source ?? 'storyboard',
  }

  const { data, error } = await supabase
    .from('project_assets')
    .insert({
      project_id: params.projectId,
      user_id: params.userId,
      kind: 'image',
      url: null,
      storage_path: params.storagePath,
      bucket,
      mime_type: params.mimeType ?? 'image/png',
      scene_id: params.sceneId,
      sha256: params.sha256,
      file_size: params.fileSize,
      title: params.title?.trim() || null,
      prompt: params.prompt?.trim() || null,
      metadata,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`project_assets insert failed: ${error?.message ?? 'unknown'}`)
  }

  return data as ProjectAssetRow
}

/** Soft-delete DB row first (production safety). */
export async function softDeleteAsset(
  assetId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase ?? requireSupabaseServiceClient()
  const { error } = await client
    .from('project_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assetId)
    .is('deleted_at', null)

  return !error
}

export async function hardDeleteAssetRow(
  assetId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase ?? requireSupabaseServiceClient()
  const { error } = await client.from('project_assets').delete().eq('id', assetId)
  return !error
}

export async function getSceneImageAsset(params: {
  projectId: string
  sceneId: string
  assetId?: string | null
  supabase?: SupabaseClient
}): Promise<ProjectAssetRow | null> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()

  if (params.assetId?.trim()) {
    const { data } = await supabase
      .from('project_assets')
      .select('*')
      .eq('id', params.assetId.trim())
      .is('deleted_at', null)
      .maybeSingle()
    return (data as ProjectAssetRow | null) ?? null
  }

  const { data } = await supabase
    .from('project_assets')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('scene_id', params.sceneId)
    .eq('kind', 'image')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as ProjectAssetRow | null) ?? null
}

export async function listProjectImageAssets(
  projectId: string,
  supabase?: SupabaseClient
): Promise<ProjectAssetRow[]> {
  const client = supabase ?? requireSupabaseServiceClient()
  const { data } = await client
    .from('project_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('kind', 'image')
    .is('deleted_at', null)

  return (data as ProjectAssetRow[] | null) ?? []
}

export async function listActiveAssets(supabase?: SupabaseClient): Promise<ProjectAssetRow[]> {
  const client = supabase ?? requireSupabaseServiceClient()
  const { data } = await client
    .from('project_assets')
    .select('*')
    .is('deleted_at', null)
    .not('storage_path', 'is', null)

  return (data as ProjectAssetRow[] | null) ?? []
}
