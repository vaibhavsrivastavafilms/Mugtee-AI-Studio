import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getBrandBySlug,
  listBrandProfiles,
  loadMemoryProfile,
} from '@/lib/memory/memory-manager'
import { embedText, searchMemoryEmbeddings } from '@/lib/memory/memory-embeddings'
import type {
  BrandProfile,
  ContentHistoryEntry,
  CreatorPattern,
  MemoryKind,
  RetrievedMemoryBundle,
} from '@/lib/memory/types'

export type RetrieveMemoryOptions = {
  brandSlug?: string
  query?: string
  projectId?: string
  includeSemantic?: boolean
}

async function loadPatterns(
  supabase: SupabaseClient,
  userId: string,
  brandId?: string | null
): Promise<CreatorPattern[]> {
  let q = supabase
    .from('creator_patterns')
    .select('id, pattern_type, label, strength, payload, brand_id')
    .eq('user_id', userId)
    .order('strength', { ascending: false })
    .limit(20)

  if (brandId) q = q.eq('brand_id', brandId)

  const { data } = await q
  return (data ?? []).map((r) => ({
    id: String(r.id),
    patternType: String(r.pattern_type),
    label: String(r.label),
    strength: Number(r.strength ?? 1),
    payload: (r.payload as Record<string, unknown>) ?? {},
    brandId: r.brand_id ? String(r.brand_id) : null,
  }))
}

async function loadContentHistory(
  supabase: SupabaseClient,
  userId: string,
  brandId?: string | null,
  projectId?: string
): Promise<ContentHistoryEntry[]> {
  let q = supabase
    .from('content_history')
    .select('id, project_id, brand_id, content_type, title, hook, theme, platform, format, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15)

  if (brandId) q = q.eq('brand_id', brandId)
  if (projectId) q = q.eq('project_id', projectId)

  const { data } = await q
  return (data ?? []).map((r) => ({
    id: String(r.id),
    projectId: r.project_id ? String(r.project_id) : null,
    brandId: r.brand_id ? String(r.brand_id) : null,
    contentType: String(r.content_type),
    title: r.title ?? undefined,
    hook: r.hook ?? undefined,
    theme: r.theme ?? undefined,
    platform: r.platform ?? undefined,
    format: r.format ?? undefined,
    at: String(r.created_at),
  }))
}

async function loadAgentMemories(
  supabase: SupabaseClient,
  userId: string,
  brandId?: string | null
): Promise<RetrievedMemoryBundle['agentMemories']> {
  let q = supabase
    .from('agent_memories')
    .select('memory_type, key, content')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(24)

  if (brandId) {
    q = q.or(`brand_id.eq.${brandId},brand_id.is.null`)
  }

  const { data } = await q
  return (data ?? []).map((r) => ({
    type: String(r.memory_type) as MemoryKind,
    key: String(r.key),
    content: String(r.content).slice(0, 500),
  }))
}

/** Pipeline: profile → brand → projects → formats → history */
export async function retrieveCreatorMemory(
  supabase: SupabaseClient,
  userId: string,
  options: RetrieveMemoryOptions = {}
): Promise<RetrievedMemoryBundle> {
  const profile = await loadMemoryProfile(supabase, userId)
  const brands = await listBrandProfiles(supabase, userId)

  let activeBrand: BrandProfile | null = null
  if (options.brandSlug) {
    activeBrand = await getBrandBySlug(supabase, userId, options.brandSlug)
  } else {
    activeBrand = brands.find((b) => b.isDefault) ?? brands[0] ?? null
  }

  const brandId = activeBrand?.id ?? null

  const [patterns, history, agentMemories] = await Promise.all([
    loadPatterns(supabase, userId, brandId),
    loadContentHistory(supabase, userId, brandId, options.projectId),
    loadAgentMemories(supabase, userId, brandId),
  ])

  let semanticHits: RetrievedMemoryBundle['semanticHits'] = []
  if (options.includeSemantic !== false && options.query?.trim()) {
    const vec = await embedText(options.query)
    if (vec) {
      const hits = await searchMemoryEmbeddings(supabase, userId, vec, 5)
      semanticHits = hits.map((h) => ({
        text: h.text,
        score: h.score,
        sourceType: h.sourceType,
      }))
    }
  }

  if (activeBrand?.dna && Object.keys(activeBrand.dna).length) {
    profile.creatorDna = { ...profile.creatorDna, ...activeBrand.dna }
  }

  return {
    profile,
    brands,
    activeBrand,
    patterns,
    history,
    agentMemories,
    semanticHits,
  }
}
