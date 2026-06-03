import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrandProfile, MemoryKind } from '@/lib/memory/types'
import { normalizeCreatorDna } from '@/lib/memory/creator-memory-engine'
import { profileToDbPatch, rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import type { MemoryProfile } from '@/lib/memory/types'

export function rowToBrandProfile(row: Record<string, unknown>): BrandProfile {
  return {
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name ?? row.slug),
    dna: normalizeCreatorDna(row.dna),
    preferences:
      row.preferences && typeof row.preferences === 'object' && !Array.isArray(row.preferences)
        ? (row.preferences as Record<string, unknown>)
        : {},
    isDefault: Boolean(row.is_default),
  }
}

export async function listBrandProfiles(
  supabase: SupabaseClient,
  userId: string
): Promise<BrandProfile[]> {
  const { data } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
  return (data ?? []).map((r) => rowToBrandProfile(r as Record<string, unknown>))
}

export async function getBrandBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: string
): Promise<BrandProfile | null> {
  const { data } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug.toLowerCase().replace(/\s+/g, '-'))
    .maybeSingle()
  return data ? rowToBrandProfile(data as Record<string, unknown>) : null
}

export async function upsertBrandProfile(
  supabase: SupabaseClient,
  userId: string,
  input: { slug: string; displayName: string; dna?: Record<string, unknown>; isDefault?: boolean }
): Promise<BrandProfile | null> {
  const slug = input.slug.toLowerCase().replace(/\s+/g, '-').slice(0, 64)
  const { data, error } = await supabase
    .from('brand_profiles')
    .upsert(
      {
        user_id: userId,
        slug,
        display_name: input.displayName.slice(0, 120),
        dna: input.dna ?? {},
        is_default: input.isDefault ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,slug' }
    )
    .select('*')
    .single()
  if (error || !data) return null
  return rowToBrandProfile(data as Record<string, unknown>)
}

export async function upsertAgentMemory(
  supabase: SupabaseClient,
  userId: string,
  input: {
    memoryType: MemoryKind
    key: string
    content: string
    brandId?: string | null
    embedding?: number[] | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('agent_memories').upsert(
    {
      user_id: userId,
      brand_id: input.brandId ?? null,
      memory_type: input.memoryType,
      key: input.key.slice(0, 80),
      content: input.content.slice(0, 2000),
      embedding: input.embedding ?? null,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,brand_id,memory_type,key' }
  )
}

export async function exportUserMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, unknown>> {
  const [profileRow, brands, patterns, feedback, agentMem, history, embeddings, events] =
    await Promise.all([
      supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('brand_profiles').select('*').eq('user_id', userId),
      supabase.from('creator_patterns').select('*').eq('user_id', userId),
      supabase.from('creator_feedback').select('*').eq('user_id', userId).limit(500),
      supabase.from('agent_memories').select('*').eq('user_id', userId),
      supabase.from('content_history').select('*').eq('user_id', userId).limit(500),
      supabase.from('memory_embeddings').select('id, source_type, source_id, text_preview, created_at').eq('user_id', userId),
      supabase.from('creator_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
    ])

  return {
    exportedAt: new Date().toISOString(),
    profile: profileRow.data ?? null,
    brands: brands.data ?? [],
    patterns: patterns.data ?? [],
    feedback: feedback.data ?? [],
    agentMemories: agentMem.data ?? [],
    contentHistory: history.data ?? [],
    embeddingPreviews: embeddings.data ?? [],
    recentEvents: events.data ?? [],
  }
}

export async function deleteUserMemory(
  supabase: SupabaseClient,
  userId: string,
  scope: 'all' | 'patterns' | 'embeddings' | 'agent' = 'all'
): Promise<void> {
  const tables: string[] =
    scope === 'all'
      ? [
          'memory_embeddings',
          'content_history',
          'creator_feedback',
          'creator_patterns',
          'agent_memories',
          'brand_profiles',
        ]
      : scope === 'patterns'
        ? ['creator_patterns', 'creator_feedback', 'content_history']
        : scope === 'embeddings'
          ? ['memory_embeddings']
          : ['agent_memories']

  for (const table of tables) {
    await supabase.from(table).delete().eq('user_id', userId)
  }

  if (scope === 'all') {
    const empty = rowToMemoryProfile(null)
    await supabase
      .from('creator_profiles')
      .update({
        ...profileToDbPatch(empty),
        creator_memory: {},
        learning_events: [],
      })
      .eq('user_id', userId)
  }
}

export async function loadMemoryProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<MemoryProfile> {
  const { data } = await supabase
    .from('creator_profiles')
    .select(
      'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle()
  return rowToMemoryProfile(data)
}
