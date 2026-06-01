import { createCachedOpenAIChatCompletion } from '@/lib/ai/cached-openai-chat.server'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildHookSystemPrompt,
  buildHookUserPrompt,
  buildScriptMessages,
  extractHookFromParsed,
  extractTitleFromParsed,
} from '@/lib/ai/providers/prompt-helpers'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import type {
  AIProvider,
  CaptionResult,
  HookInput,
  HookResult,
  ScriptInput,
  ScriptResult,
  TitleResult,
} from '@/lib/ai/providers/types'
import { hasProviderKey } from '@/lib/ai/providers/task-routing'

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const

  isAvailable(): boolean {
    return hasProviderKey('openai')
  }

  async generateHook(input: HookInput): Promise<HookResult> {
    const openai = getOpenAIClient()
    const completion = await createCachedOpenAIChatCompletion(openai, {
      model: process.env.OPENAI_MODEL?.trim() || FREE_OPENAI_CHAT_MODEL,
      temperature: 0.88,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildHookSystemPrompt() },
        { role: 'user', content: buildHookUserPrompt(input) },
      ],
    })
    const parsed = parseLlmJsonText(completion.choices[0]?.message?.content || '{}')
    const hook = extractHookFromParsed(parsed)
    if (!hook) throw new Error('OpenAI returned empty hook')
    return {
      hook,
      title: extractTitleFromParsed(parsed),
      hookFramework:
        typeof parsed.hookFramework === 'string' ? parsed.hookFramework : undefined,
      provider: this.id,
    }
  }

  async generateScript(input: ScriptInput): Promise<ScriptResult> {
    const { systemPrompt, userPrompt } = buildScriptMessages(input)
    const openai = getOpenAIClient()
    const completion = await createCachedOpenAIChatCompletion(openai, {
      model: process.env.OPENAI_MODEL?.trim() || FREE_OPENAI_CHAT_MODEL,
      temperature: input.temperature ?? 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    const parsed = parseLlmJsonText(completion.choices[0]?.message?.content || '{}')
    return { parsed, provider: this.id }
  }

  async generateTitle(input: HookInput): Promise<TitleResult> {
    const result = await this.generateHook(input)
    return {
      title: result.title ?? result.hook.slice(0, 80),
      provider: this.id,
    }
  }

  async generateCaption(
    input: HookInput & { script?: string }
  ): Promise<CaptionResult> {
    const openai = getOpenAIClient()
    const completion = await createCachedOpenAIChatCompletion(openai, {
      model: process.env.OPENAI_MODEL?.trim() || FREE_OPENAI_CHAT_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return JSON captions: { "primary": "...", "cta": "...", "hashtags": [] }',
        },
        {
          role: 'user',
          content: injectContextStub(input),
        },
      ],
    })
    const parsed = parseLlmJsonText(completion.choices[0]?.message?.content || '{}')
    return { captions: parsed, provider: this.id }
  }
}

function injectContextStub(input: HookInput & { script?: string }): string {
  return [
    input.context?.injectionBlock,
    `TOPIC: ${input.topic}`,
    input.script ? `SCRIPT:\n${input.script.slice(0, 2000)}` : '',
    'Write platform-native captions.',
  ]
    .filter(Boolean)
    .join('\n\n')
}
