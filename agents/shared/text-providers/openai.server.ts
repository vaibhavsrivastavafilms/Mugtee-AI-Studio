import 'server-only'

import {
  classifyUnknownProviderError,
  ProviderRequestError,
  type TextLlmProviderId,
} from '@/agents/shared/provider-errors'
import type { StructuredJsonRequest, TextLlmProvider } from '@/agents/shared/text-llm.types'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

async function callOpenAiJson<T extends Record<string, unknown>>(
  params: StructuredJsonRequest
): Promise<T> {
  const provider: TextLlmProviderId = 'openai'

  try {
    const openai = getOpenAIClient()
    const model = process.env.OPENAI_MODEL?.trim() || FREE_OPENAI_CHAT_MODEL

    const completion = await openai.chat.completions.create({
      model,
      temperature: params.temperature ?? 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    })

    const text = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!text) {
      throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
        message: 'OpenAI returned empty JSON',
      })
    }

    const parsed = parseLlmJsonText(text)
    if (!parsed || Object.keys(parsed).length === 0) {
      throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
        message: 'OpenAI returned invalid JSON',
      })
    }

    return parsed as T
  } catch (err) {
    if (err instanceof ProviderRequestError) throw err
    throw classifyUnknownProviderError(provider, err)
  }
}

export const openaiTextProvider: TextLlmProvider = {
  id: 'openai',
  isConfigured: hasOpenAiKey,
  generateStructuredJson: callOpenAiJson,
}
