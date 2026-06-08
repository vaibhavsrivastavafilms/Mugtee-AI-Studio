import { generateScriptViaRouter, hasAnyTextProviderKey } from '@/lib/ai/providers/generation-bridge'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import type { CreativeTeamContext } from '@/lib/creative-team/types'

export type CreativePromptRouteInput = {
  systemPrompt: string
  userPrompt: string
  topic: string
  ctx: CreativeTeamContext
  temperature?: number
}

/** Route creative-team prompts through the provider router with director memory + intelligence graph + Virlo. */
export async function routeCreativeTeamPrompt(
  input: CreativePromptRouteInput
): Promise<{ parsed: Record<string, unknown>; raw: string } | null> {
  if (!hasAnyTextProviderKey()) return null

  const enrichedUser = [
    input.ctx.directorMemoryPrompt,
    input.ctx.intelligenceGraphPrompt,
    input.ctx.virloMarketPrompt,
    input.userPrompt,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const result = await generateScriptViaRouter({
      systemPrompt: input.systemPrompt,
      userPrompt: enrichedUser,
      topic: input.topic,
      temperature: input.temperature ?? 0.7,
      contextInput: {
        topic: input.topic,
        niche: input.ctx.creatorDna?.niche,
        tone: input.ctx.creatorDna?.tone,
        platform: input.ctx.creatorDna?.platform,
      },
    })
    const parsed = parseLlmJsonText(JSON.stringify(result.parsed)) as Record<string, unknown>
    return { parsed, raw: JSON.stringify(parsed) }
  } catch {
    return null
  }
}
