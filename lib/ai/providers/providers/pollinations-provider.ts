import {
  buildHookSystemPrompt,
  buildHookUserPrompt,
  buildScriptMessages,
  extractHookFromParsed,
  extractTitleFromParsed,
} from '@/lib/ai/providers/prompt-helpers'
import { parseLlmJsonText, SCRIPT_GENERATION_MAX_TOKENS } from '@/lib/ai/providers/shared'
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
import { fetchPollinationsChatCompletion } from '@/lib/pollinations/text.server'

export class PollinationsProvider implements AIProvider {
  readonly id = 'pollinations' as const

  isAvailable(): boolean {
    return hasProviderKey('pollinations')
  }

  async generateHook(input: HookInput): Promise<HookResult> {
    const { text } = await fetchPollinationsChatCompletion({
      messages: [
        { role: 'system', content: buildHookSystemPrompt() },
        { role: 'user', content: buildHookUserPrompt(input) },
      ],
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('hook'),
    })
    const parsed = parseLlmJsonText(text)
    const hook = extractHookFromParsed(parsed)
    if (!hook) throw new Error('Pollinations returned empty hook')
    return {
      hook,
      title: extractTitleFromParsed(parsed),
      provider: this.id,
    }
  }

  async generateScript(input: ScriptInput): Promise<ScriptResult> {
    const { systemPrompt, userPrompt } = buildScriptMessages(input)
    const { text } = await fetchPollinationsChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      maxTokens: SCRIPT_GENERATION_MAX_TOKENS,
      temperature: input.temperature,
      timeoutMs: getTaskTimeoutMs('script'),
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
    const { text } = await fetchPollinationsChatCompletion({
      messages: [
        { role: 'system', content: 'Return JSON captions only.' },
        {
          role: 'user',
          content: `TOPIC: ${input.topic}\n${input.script?.slice(0, 2000) ?? ''}`,
        },
      ],
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('caption'),
    })
    return { captions: parseLlmJsonText(text), provider: this.id }
  }
}
