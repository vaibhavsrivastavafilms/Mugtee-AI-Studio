import { getOpenAIClient } from '@/lib/ai/openai-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_STORED = 200

export type EmbeddingVector = number[]

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom > 0 ? dot / denom : 0
}

export async function embedText(text: string): Promise<EmbeddingVector | null> {
  const trimmed = text.trim().slice(0, 8000)
  if (!trimmed) return null
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  try {
    const client = getOpenAIClient()
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: trimmed,
    })
    const vec = res.data[0]?.embedding
    return Array.isArray(vec) ? vec : null
  } catch {
    return null
  }
}

export async function upsertMemoryEmbedding(
  supabase: SupabaseClient,
  userId: string,
  input: {
    sourceType: string
    sourceId: string
    textPreview: string
    embedding: EmbeddingVector
    brandId?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('memory_embeddings').upsert(
    {
      user_id: userId,
      brand_id: input.brandId ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId,
      text_preview: input.textPreview.slice(0, 500),
      embedding: input.embedding,
      metadata: input.metadata ?? {},
    },
    { onConflict: 'user_id,source_type,source_id' }
  )

  const { count } = await supabase
    .from('memory_embeddings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > MAX_STORED) {
    const { data: stale } = await supabase
      .from('memory_embeddings')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit((count ?? 0) - MAX_STORED)
    const ids = (stale ?? []).map((r) => r.id)
    if (ids.length) await supabase.from('memory_embeddings').delete().in('id', ids)
  }
}

export async function searchMemoryEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  queryEmbedding: EmbeddingVector,
  limit = 5
): Promise<Array<{ text: string; score: number; sourceType: string; sourceId: string }>> {
  const { data } = await supabase
    .from('memory_embeddings')
    .select('text_preview, embedding, source_type, source_id')
    .eq('user_id', userId)
    .limit(80)

  const scored = (data ?? [])
    .map((row) => {
      const emb = row.embedding as unknown
      if (!Array.isArray(emb)) return null
      const vec = emb.filter((n): n is number => typeof n === 'number')
      if (vec.length !== queryEmbedding.length) return null
      return {
        text: String(row.text_preview ?? ''),
        score: cosineSimilarity(queryEmbedding, vec),
        sourceType: String(row.source_type ?? ''),
        sourceId: String(row.source_id ?? ''),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.text.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}
