import {
  buildProviderContext,
  executeWithFallback,
  getAvailableProviders,
  hasProviderKey,
  recordLastProvider,
  type ProviderContextInput,
} from '@/lib/ai/providers'
import { isHookTooSimilar } from '@/lib/cinematic/hook-variation'
import { isBannedHookOpening } from '@/lib/cinematic/content-angle-engine'
import type { CinematicNiche } from '@/lib/cinematic/niches'

export type AiHookGenerationInput = ProviderContextInput & {
  emotionalGoal?: string
  previousHooks?: string[]
  contentAngleLabel?: string
  hookFrameworkLabel?: string
}

export type AiHookGenerationResult = {
  hook: string
  title?: string
  provider: string
  source: 'ai-router' | 'virlo-fallback'
}

function isValidHook(hook: string, avoid: string[]): boolean {
  const trimmed = hook.trim()
  if (trimmed.length < 8) return false
  if (isBannedHookOpening(trimmed)) return false
  if (isHookTooSimilar(trimmed, avoid)) return false
  return true
}

/** Generate hook via multi-provider router; returns null when no keys or all providers fail. */
export async function generateHookViaRouter(
  input: AiHookGenerationInput
): Promise<AiHookGenerationResult | null> {
  if (getAvailableProviders().length === 0) return null

  const context = buildProviderContext(input)
  const avoid = input.previousHooks ?? []

  try {
    const result = await executeWithFallback('hook', async (provider) => {
      const hookResult = await provider.generateHook({
        topic: input.topic,
        niche: input.niche ?? 'general',
        tone: input.tone,
        platform: input.platform,
        emotionalGoal: input.emotionalGoal,
        previousHooks: avoid,
        contentAngleLabel: input.contentAngleLabel,
        hookFrameworkLabel: input.hookFrameworkLabel,
        context,
      })
      if (!isValidHook(hookResult.hook, avoid)) {
        throw new Error('Hook failed validation')
      }
      return hookResult
    })

    recordLastProvider('hook', result.provider)
    return {
      hook: result.hook,
      title: result.title,
      provider: result.provider,
      source: 'ai-router',
    }
  } catch (err) {
    console.warn('[ai-router] hook generation exhausted providers', err)
    return null
  }
}

export function hasAnyTextProviderKey(): boolean {
  return (
    hasProviderKey('openai') ||
    hasProviderKey('gemini') ||
    hasProviderKey('groq') ||
    hasProviderKey('openrouter') ||
    hasProviderKey('deepseek')
  )
}

export type AiScriptRouterInput = {
  systemPrompt: string
  userPrompt: string
  topic: string
  temperature?: number
  contextInput?: ProviderContextInput
}

export async function generateScriptViaRouter(input: AiScriptRouterInput) {
  const context = input.contextInput ? buildProviderContext(input.contextInput) : undefined

  const result = await executeWithFallback('script', async (provider) =>
    provider.generateScript({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      topic: input.topic,
      temperature: input.temperature,
      context,
    })
  )

  recordLastProvider('script', result.provider)
  return result
}
