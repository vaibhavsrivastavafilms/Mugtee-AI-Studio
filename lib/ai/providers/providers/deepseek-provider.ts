import {
  buildHookSystemPrompt,
  buildHookUserPrompt,
  buildScriptMessages,
  extractHookFromParsed,
  extractTitleFromParsed,
} from '@/lib/ai/providers/prompt-helpers'
import { callOpenAICompatibleChat, parseLlmJsonText } from '@/lib/ai/providers/shared'
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

const DEEPSEEK_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'

function deepseekKey(): string {
  const key = process.env.DEEPSEEK_API_KEY?.trim()
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured')
  return key
}

export class DeepSeekProvider implements AIProvider {
  readonly id = 'deepseek' as const

  isAvailable(): boolean {
    return hasProviderKey('deepseek')
  }

  async generateHook(input: HookInput): Promise<HookResult> {
    const text = await callOpenAICompatibleChat({
      apiKey: deepseekKey(),
      baseUrl: DEEPSEEK_BASE,
      model: DEFAULT_MODEL,
      jsonMode: true,
      temperature: 0.88,
      timeoutMs: getTaskTimeoutMs('hook'),
      messages: [
        { role: 'system', content: buildHookSystemPrompt() },
        { role: 'user', content: buildHookUserPrompt(input) },
      ],
    })
    const parsed = parseLlmJsonText(text)
    const hook = extractHookFromParsed(parsed)
    if (!hook) throw new Error('DeepSeek returned empty hook')
    return {
      hook,
      title: extractTitleFromParsed(parsed),
      provider: this.id,
    }
  }

  async generateScript(input: ScriptInput): Promise<ScriptResult> {
    const { systemPrompt, userPrompt } = buildScriptMessages(input)
    const text = await callOpenAICompatibleChat({
      apiKey: deepseekKey(),
      baseUrl: DEEPSEEK_BASE,
      model: DEFAULT_MODEL,
      jsonMode: true,
      temperature: input.temperature ?? 0.85,
      timeoutMs: getTaskTimeoutMs('script'),
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
      apiKey: deepseekKey(),
      baseUrl: DEEPSEEK_BASE,
      model: DEFAULT_MODEL,
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('caption'),
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
