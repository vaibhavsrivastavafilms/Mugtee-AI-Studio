import type { SupabaseClient } from '@supabase/supabase-js'
import { embedText, upsertMemoryEmbedding } from '@/lib/memory/memory-embeddings'
import { projectAssetKindToType } from '@/lib/assets/types'
import type { AssetType } from '@/lib/assets/types'

function contentHash(title: string, tags: string[], type: string): string {
  const raw = `${type}|${title.toLowerCase().trim()}|${[...tags].sort().join(',')}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0
  return `h${Math.abs(h).toString(36)}`
}

export async function upsertCreativeAsset(
  supabase: SupabaseClient,
  userId: string,
  input: {
    type: AssetType
    title: string
    description?: string | null
    tags?: string[]
    brandId?: string | null
    projectId?: string | null
    sourceType: string
    sourceId: string
    metadata?: Record<string, unknown>
    indexEmbedding?: boolean
  }
): Promise<string | null> {
  const tags = input.tags ?? []
  const hash = contentHash(input.title, tags, input.type)

  const { data, error } = await supabase
    .from('creative_assets')
    .upsert(
      {
        user_id: userId,
        type: input.type,
        title: input.title.slice(0, 500),
        description: input.description?.slice(0, 2000) ?? null,
        tags,
        brand_id: input.brandId ?? null,
        project_id: input.projectId ?? null,
        source_type: input.sourceType,
        source_id: input.sourceId,
        content_hash: hash,
        metadata: input.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,source_type,source_id' }
    )
    .select('id')
    .single()

  if (error || !data) return null

  if (input.indexEmbedding !== false) {
    const preview = [input.title, input.description, ...tags].filter(Boolean).join(' · ')
    const embedding = await embedText(preview)
    if (embedding) {
      await upsertMemoryEmbedding(supabase, userId, {
        sourceType: 'creative_asset',
        sourceId: data.id,
        textPreview: preview,
        embedding,
        brandId: input.brandId,
        metadata: { assetType: input.type, projectId: input.projectId },
      })
    }
  }

  return data.id
}

export async function indexProjectAssets(
  supabase: SupabaseClient,
  userId: string,
  opts?: { projectId?: string; limit?: number }
): Promise<number> {
  let q = supabase
    .from('project_assets')
    .select('id, project_id, kind, url, title, prompt, metadata, tags, brand_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 200)

  if (opts?.projectId) q = q.eq('project_id', opts.projectId)

  const { data } = await q
  let count = 0
  for (const row of data ?? []) {
    const id = await upsertCreativeAsset(supabase, userId, {
      type: projectAssetKindToType(row.kind),
      title: row.title?.trim() || `${row.kind} asset`,
      description: row.prompt,
      tags: (row.tags as string[] | null) ?? [],
      brandId: row.brand_id,
      projectId: row.project_id,
      sourceType: 'project_asset',
      sourceId: row.id,
      metadata: {
        url: row.url,
        kind: row.kind,
        ...(row.metadata as Record<string, unknown>),
      },
    })
    if (id) count++
  }
  return count
}

export async function indexCinematicProjects(
  supabase: SupabaseClient,
  userId: string,
  opts?: { limit?: number }
): Promise<number> {
  const { data } = await supabase
    .from('cinematic_projects')
    .select('id, title, prompt, script, storyboard, voice, niche, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(opts?.limit ?? 100)

  let count = 0
  for (const p of data ?? []) {
    const campaignId = await upsertCreativeAsset(supabase, userId, {
      type: 'campaign',
      title: p.title || 'Untitled campaign',
      description: p.prompt,
      tags: p.niche ? [String(p.niche)] : [],
      projectId: p.id,
      sourceType: 'cinematic_project',
      sourceId: p.id,
      metadata: { role: 'campaign' },
    })
    if (campaignId) count++

    if (p.script?.trim()) {
      const scriptId = await upsertCreativeAsset(supabase, userId, {
        type: 'script',
        title: `${p.title} — Script`,
        description: p.script.slice(0, 500),
        projectId: p.id,
        sourceType: 'cinematic_script',
        sourceId: p.id,
        metadata: { scriptLength: p.script.length },
      })
      if (scriptId && campaignId) {
        const { linkAssets } = await import('@/lib/assets/asset-relations')
        await linkAssets(supabase, userId, campaignId, scriptId, 'campaign_contains')
      }
      if (scriptId) count++
    }

    const sb = p.storyboard as { scenes?: unknown[] } | null
    if (sb && Array.isArray(sb.scenes) && sb.scenes.length) {
      const sbId = await upsertCreativeAsset(supabase, userId, {
        type: 'storyboard',
        title: `${p.title} — Storyboard`,
        projectId: p.id,
        sourceType: 'cinematic_storyboard',
        sourceId: p.id,
        metadata: { sceneCount: sb.scenes.length },
      })
      if (sbId) count++
    }

    const voice = p.voice as { audioUrl?: string } | null
    if (voice?.audioUrl) {
      const vId = await upsertCreativeAsset(supabase, userId, {
        type: 'voiceover',
        title: `${p.title} — Voiceover`,
        projectId: p.id,
        sourceType: 'cinematic_voice',
        sourceId: p.id,
        metadata: { audioUrl: voice.audioUrl },
      })
      if (vId) count++
    }
  }
  return count
}

/** Full reindex: project_assets + cinematic_projects */
export async function reindexUserAssets(
  supabase: SupabaseClient,
  userId: string
): Promise<{ projectAssets: number; projects: number }> {
  const projectAssets = await indexProjectAssets(supabase, userId)
  const projects = await indexCinematicProjects(supabase, userId)
  return { projectAssets, projects }
}
