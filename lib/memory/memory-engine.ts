import type { SupabaseClient } from '@supabase/supabase-js'
import { formatCreatorMemoryForPrompt } from '@/lib/memory/memory-prompt-injection'
import {
  retrieveCreatorMemory,
  type RetrieveMemoryOptions,
} from '@/lib/memory/memory-retriever'
import { formatRankedSnippets, rankMemorySnippets } from '@/lib/memory/memory-ranker'
import type { RetrievedMemoryBundle } from '@/lib/memory/types'
import {
  getCachedMemorySession,
  memoryCacheKey,
  setCachedMemorySession,
} from '@/lib/ai-agent/memory-session-cache'

export type MemoryEngineResult = {
  bundle: RetrievedMemoryBundle
  context: string
  cacheKey: string
}

/** Orchestrate retrieval + ranking + prompt formatting for agents and generation */
export async function runMemoryEngine(
  supabase: SupabaseClient,
  userId: string,
  goalOrQuery: string,
  options: RetrieveMemoryOptions = {}
): Promise<MemoryEngineResult> {
  const cacheKey = memoryCacheKey(
    userId,
    `${goalOrQuery}|${options.brandSlug ?? ''}|${options.projectId ?? ''}`
  )
  const cached = getCachedMemorySession(cacheKey)
  if (cached) {
    return {
      bundle: {
        profile: cached.profile,
        brands: [],
        patterns: [],
        history: [],
        agentMemories: [],
        semanticHits: [],
      },
      context: cached.context,
      cacheKey,
    }
  }

  const bundle = await retrieveCreatorMemory(supabase, userId, {
    ...options,
    query: goalOrQuery,
    includeSemantic: true,
  })

  const base = formatCreatorMemoryForPrompt({ profile: bundle.profile })
  const ranked = formatRankedSnippets(rankMemorySnippets(bundle, goalOrQuery))
  const context = [base, ranked].filter(Boolean).join('\n\n')

  setCachedMemorySession(cacheKey, bundle.profile, context)
  return { bundle, context, cacheKey }
}
