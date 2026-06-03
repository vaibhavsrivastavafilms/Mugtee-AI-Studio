import type { SupabaseClient } from '@supabase/supabase-js'
import { runMemoryEngine } from '@/lib/memory/memory-engine'
import { injectContext } from '@/lib/ai/providers/context-injection'
import { buildProviderContext } from '@/lib/ai/providers/context-injection'
import type { ProviderContextInput } from '@/lib/ai/providers/types'

export type CreatorTwinGenerateInput = {
  userPrompt: string
  goal?: string
  brandSlug?: string
  projectId?: string
  providerContext?: Omit<ProviderContextInput, 'memoryProfile'>
}

/** Generate-ready prompt with injected creator twin style from retrieved memory */
export async function buildCreatorTwinPrompt(
  supabase: SupabaseClient,
  userId: string,
  input: CreatorTwinGenerateInput
): Promise<{ prompt: string; memoryContext: string }> {
  const goal = input.goal?.trim() || input.userPrompt.slice(0, 200)
  const { bundle, context } = await runMemoryEngine(supabase, userId, goal, {
    brandSlug: input.brandSlug,
    projectId: input.projectId,
  })

  const providerCtx = buildProviderContext({
    topic: input.providerContext?.topic ?? goal,
    niche: input.providerContext?.niche,
    tone: input.providerContext?.tone,
    platform: input.providerContext?.platform,
    memoryProfile: bundle.profile,
    parsedIntent: input.providerContext?.parsedIntent,
    contentBrief: input.providerContext?.contentBrief,
    companionMemory: input.providerContext?.companionMemory,
  })

  const twinBlock = context ? `${context}\n\n` : ''
  const combined = injectContext(input.userPrompt, {
    injectionBlock: [twinBlock, providerCtx.injectionBlock].filter(Boolean).join('\n\n'),
    nicheLock: providerCtx.nicheLock,
  })

  return { prompt: combined, memoryContext: context }
}
