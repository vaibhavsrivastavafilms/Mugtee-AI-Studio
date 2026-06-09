import {
  buildHookSystemPrompt,
  buildHookUserPrompt,
  buildScriptMessages,
  extractHookFromParsed,
  extractTitleFromParsed,
} from '@/lib/ai/providers/prompt-helpers'
import {
  callOpenAICompatibleChat,
  parseLlmJsonText,
  SCRIPT_GENERATION_MAX_TOKENS,
} from '@/lib/ai/providers/shared'
import type {
  AIProvider,
  CaptionResult,
  HookInput,
  HookResult,
  ScriptInput,
  ScriptResult,
  TitleResult,
} from '@/lib/ai/providers/types'
import { getTaskTimeoutMs, hasProviderKey } from '@/lib/ai/providers/task-routing'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || 'meta-llama/llama-3.3-70b-instruct'

function openRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) throw new Error('OPENROUTER_API_KEY not configured')
  return key
}

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter' as const

  isAvailable(): boolean {
    return hasProviderKey('openrouter')
  }

  private extraHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    const referer = process.env.NEXT_PUBLIC_BASE_URL?.trim()
    if (referer) headers['HTTP-Referer'] = referer
    headers['X-Title'] = 'Mugtee AI Studio'
    return headers
  }

  async generateHook(input: HookInput): Promise<HookResult> {
    const text = await callOpenAICompatibleChat({
      apiKey: openRouterKey(),
      baseUrl: OPENROUTER_BASE,
      model: DEFAULT_MODEL,
      jsonMode: true,
      temperature: 0.88,
      timeoutMs: getTaskTimeoutMs('hook'),
      extraHeaders: this.extraHeaders(),
      messages: [
        { role: 'system', content: buildHookSystemPrompt() },
        { role: 'user', content: buildHookUserPrompt(input) },
      ],
    })
    const parsed = parseLlmJsonText(text)
    const hook = extractHookFromParsed(parsed)
    if (!hook) throw new Error('OpenRouter returned empty hook')
    return {
      hook,
      title: extractTitleFromParsed(parsed),
      provider: this.id,
    }
  }

  async generateScript(input: ScriptInput): Promise<ScriptResult> {
    const { systemPrompt, userPrompt } = buildScriptMessages(input)
    const text = await callOpenAICompatibleChat({
      apiKey: openRouterKey(),
      baseUrl: OPENROUTER_BASE,
      model: process.env.OPENROUTER_SCRIPT_MODEL?.trim() || DEFAULT_MODEL,
      jsonMode: true,
      maxTokens: SCRIPT_GENERATION_MAX_TOKENS,
      temperature: input.temperature ?? 0.85,
      timeoutMs: getTaskTimeoutMs('script'),
      extraHeaders: this.extraHeaders(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    return { parsed: parseLlmJsonText(text), provider: this.id }
  }

  async generateTitle(input: HookInput): Promise<TitleResult> {
    const result = await this.generateHook(input)
    return { title: result.title ?? result.hook.slice(0, 80), provider: this.id }
  }

  async generateCaption(
    input: HookInput & { script?: string }
  ): Promise<CaptionResult> {
    const text = await callOpenAICompatibleChat({
      apiKey: openRouterKey(),
      baseUrl: OPENROUTER_BASE,
      model: DEFAULT_MODEL,
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('caption'),
      extraHeaders: this.extraHeaders(),
      messages: [
        { role: 'system', content: 'Return JSON captions only.' },
        {
          role: 'user',
          content: `TOPIC: ${input.topic}\n${input.script?.slice(0, 2000) ?? ''}`,
        },
      ],
    })
    return { captions: parseLlmJsonText(text), provider: this.id }
  }
}
