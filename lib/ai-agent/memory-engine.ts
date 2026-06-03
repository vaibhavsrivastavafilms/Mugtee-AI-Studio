import type { SupabaseClient } from '@supabase/supabase-js'
import { runMemoryEngine } from '@/lib/memory/memory-engine'
import type { MemoryEngineResult } from '@/lib/memory/memory-engine'

/** Agent-layer memory retrieval (wraps lib/memory). */
export async function loadAgentMemoryContext(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  options?: { brandSlug?: string; projectId?: string }
): Promise<MemoryEngineResult> {
  return runMemoryEngine(supabase, userId, query, {
    brandSlug: options?.brandSlug,
    projectId: options?.projectId,
    includeSemantic: true,
  })
}

export { runMemoryEngine } from '@/lib/memory/memory-engine'
