import type { SupabaseClient } from '@supabase/supabase-js'
import { embedText, upsertMemoryEmbedding } from '@/lib/memory/memory-embeddings'
import { upsertAgentMemory } from '@/lib/memory/memory-manager'
import type { MemoryKind } from '@/lib/memory/types'

export type IndexContentInput = {
  projectId?: string | null
  brandId?: string | null
  contentType: string
  title?: string
  hook?: string
  theme?: string
  platform?: string
  format?: string
  scriptExcerpt?: string
  campaign?: string
}

/** Index scripts, projects, and campaigns into content_history + embeddings */
export async function indexContentHistory(
  supabase: SupabaseClient,
  userId: string,
  input: IndexContentInput
): Promise<string | null> {
  const { data } = await supabase
    .from('content_history')
    .insert({
      user_id: userId,
      project_id: input.projectId ?? null,
      brand_id: input.brandId ?? null,
      content_type: input.contentType.slice(0, 40),
      title: input.title?.slice(0, 200) ?? null,
      hook: input.hook?.slice(0, 500) ?? null,
      theme: input.theme?.slice(0, 120) ?? null,
      platform: input.platform?.slice(0, 40) ?? null,
      format: input.format?.slice(0, 80) ?? null,
      payload: {
        campaign: input.campaign,
        scriptExcerpt: input.scriptExcerpt?.slice(0, 400),
      },
    })
    .select('id')
    .maybeSingle()

  const textParts = [
    input.title,
    input.hook,
    input.theme,
    input.format,
    input.campaign,
    input.scriptExcerpt,
  ].filter(Boolean)

  const embedSource = textParts.join('\n').trim()
  if (embedSource && input.projectId) {
    const vec = await embedText(embedSource)
    if (vec) {
      await upsertMemoryEmbedding(supabase, userId, {
        sourceType: 'project',
        sourceId: input.projectId,
        textPreview: embedSource,
        embedding: vec,
        brandId: input.brandId,
      })
    }
  }

  if (input.hook?.trim()) {
    await upsertAgentMemory(supabase, userId, {
      memoryType: 'workflow' as MemoryKind,
      key: `hook:${input.projectId ?? 'latest'}`,
      content: input.hook.slice(0, 500),
      brandId: input.brandId,
    })
  }

  return data?.id ? String(data.id) : null
}

/** Index recent cinematic_projects for a user (batch, capped) */
export async function indexRecentProjects(
  supabase: SupabaseClient,
  userId: string,
  limit = 8
): Promise<number> {
  const { data: projects } = await supabase
    .from('cinematic_projects')
    .select('id, title, hook, niche, platform, duration, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  let count = 0
  for (const p of projects ?? []) {
    await indexContentHistory(supabase, userId, {
      projectId: String(p.id),
      contentType: 'cinematic_project',
      title: typeof p.title === 'string' ? p.title : undefined,
      hook: typeof p.hook === 'string' ? p.hook : undefined,
      theme: typeof p.niche === 'string' ? p.niche : undefined,
      platform: typeof p.platform === 'string' ? p.platform : undefined,
      format: p.duration ? `${p.duration}s reel` : undefined,
    })
    count++
  }
  return count
}
