import type { MemoryProfile } from '@/lib/memory/types'
import { runMemoryEngine } from '@/lib/memory/memory-engine'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadCreatorMemoryForAgent(
  supabase: SupabaseClient,
  userId: string,
  goal: string,
  options?: { brandSlug?: string; projectId?: string }
): Promise<{ profile: MemoryProfile; context: string; cacheKey: string }> {
  const { bundle, context, cacheKey } = await runMemoryEngine(supabase, userId, goal, {
    brandSlug: options?.brandSlug,
    projectId: options?.projectId,
    query: goal,
    includeSemantic: true,
  })
  return { profile: bundle.profile, context, cacheKey }
}
