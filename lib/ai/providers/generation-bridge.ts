import {
  buildProviderContext,
  getAvailableProviders,
  hasProviderKey,
  AIProviderError,
  type ProviderContextInput,
} from '@/lib/ai/providers'
import { executeWithStyleGuard } from '@/lib/ai/providers/style-consistency'
import { isScriptGenerationMockEnabled } from '@/lib/ai/mock/mock-script-mode.server'
import {
  mockScriptToParsedRecord,
  generateMockScript,
} from '@/lib/ai/mock/mock-script-generator'
import { logMockScript, providerIdsFromFailures } from '@/lib/ai/mock/mock-script-log.server'
import { isHookTooSimilar } from '@/lib/cinematic/hook-variation'
import { isBannedHookOpening } from '@/lib/cinematic/content-angle-engine'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CaptionResult, HookResult, ScriptResult } from '@/lib/ai/providers/types'

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
    const result = await executeWithStyleGuard<HookResult>(
      'hook',
      'hook',
      context.styleFingerprint,
      (r) => r.hook,
      async (provider) => {
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
      }
    )

    return {
      hook: result.hook,
      title: result.title,
      provider: result.styleProvider,
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

function scriptTextForScoring(parsed: Record<string, unknown>): string | Record<string, unknown> {
  const script = typeof parsed.script === 'string' ? parsed.script : ''
  const hook = typeof parsed.hook === 'string' ? parsed.hook : ''
  if (script.trim()) return script
  return { hook, ...parsed }
}

export async function generateScriptViaRouter(input: AiScriptRouterInput) {
  const context = buildProviderContext(
    input.contextInput ?? { topic: input.topic }
  )
  const started = Date.now()

  try {
    const result = await executeWithStyleGuard<ScriptResult>(
      'script',
      'script',
      context.styleFingerprint,
      (r) => scriptTextForScoring(r.parsed),
      async (provider) =>
        provider.generateScript({
          systemPrompt: input.systemPrompt,
          userPrompt: input.userPrompt,
          topic: input.topic,
          temperature: input.temperature,
          context,
        })
    )

    return {
      parsed: result.parsed,
      provider: result.styleProvider,
      attemptedProviders: result.attemptedProviders,
    }
  } catch (err) {
    if (err instanceof AIProviderError && isScriptGenerationMockEnabled()) {
      const allCooldown = err.providerFailures.every(
        (f) => f.skipped && f.errorCode === 'cooldown_skip'
      )
      const mockOutput = generateMockScript({
        topic: input.topic,
        tone: input.contextInput?.tone,
        duration: input.contextInput?.duration,
        niche:
          typeof input.contextInput?.niche === 'string'
            ? (input.contextInput.niche as CinematicNiche)
            : undefined,
        platform: input.contextInput?.platform,
      })
      logMockScript({
        enabled: true,
        reason: allCooldown ? 'providers_in_cooldown' : 'all_providers_failed',
        providerFailures: providerIdsFromFailures(err.providerFailures),
        durationMs: Date.now() - started,
      })
      return {
        parsed: mockScriptToParsedRecord(mockOutput),
        provider: 'openai' as const,
        attemptedProviders: err.providerFailures.map((f) => f.provider),
        mock: true as const,
      }
    }
    throw err
  }
}

export type AiCaptionRouterInput = ProviderContextInput & {
  script?: string
}

/** Caption generation via multi-provider router with style consistency guard. */
export async function generateCaptionViaRouter(input: AiCaptionRouterInput) {
  const context = buildProviderContext(input)

  const result = await executeWithStyleGuard<CaptionResult>(
    'caption',
    'caption',
    context.styleFingerprint,
    (r) => {
      const text =
        typeof r.captions.summary === 'string'
          ? r.captions.summary
          : typeof r.captions.caption === 'string'
            ? r.captions.caption
            : JSON.stringify(r.captions)
      return text
    },
    async (provider) =>
      provider.generateCaption({
        topic: input.topic,
        niche: input.niche ?? 'general',
        tone: input.tone,
        platform: input.platform,
        script: input.script,
        context,
      })
  )

  return {
    captions: result.captions,
    provider: result.styleProvider,
  }
}
