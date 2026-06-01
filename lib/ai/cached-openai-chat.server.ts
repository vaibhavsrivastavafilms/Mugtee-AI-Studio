import type OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'
import {
  getLlmResponseCache,
  hashLlmCacheKey,
  isLlmResponseCacheEnabled,
  setLlmResponseCache,
} from '@/lib/ai/llm-response-cache.server'

function messageText(
  content: ChatCompletionCreateParamsNonStreaming['messages'][number]['content']
): string {
  if (typeof content === 'string') return content
  if (content == null) return ''
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: string }).text ?? '')
        }
        return ''
      })
      .join('\n')
  }
  return String(content)
}

function cacheKeyFromParams(params: ChatCompletionCreateParamsNonStreaming): string {
  const system = params.messages
    .filter((m) => m.role === 'system')
    .map((m) => messageText(m.content))
    .join('\n---\n')
  const user = params.messages
    .filter((m) => m.role === 'user')
    .map((m) => messageText(m.content))
    .join('\n---\n')
  return hashLlmCacheKey({
    model: params.model,
    system,
    user,
    temperature: params.temperature ?? undefined,
    responseFormat:
      params.response_format && typeof params.response_format === 'object'
        ? params.response_format.type
        : undefined,
  })
}

function syntheticCompletion(
  params: ChatCompletionCreateParamsNonStreaming,
  content: string
): ChatCompletion {
  return {
    id: `cached-${cacheKeyFromParams(params).slice(0, 12)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: params.model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content, refusal: null },
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  }
}

/** OpenAI chat completion with optional in-memory cache (dev / LLM_CACHE=1). */
export async function createCachedOpenAIChatCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming
): Promise<ChatCompletion> {
  if (!isLlmResponseCacheEnabled()) {
    return openai.chat.completions.create(params)
  }

  const key = cacheKeyFromParams(params)
  const hit = getLlmResponseCache(key)
  if (hit != null) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OPENAI] CACHE HIT', { model: params.model })
    }
    return syntheticCompletion(params, hit)
  }

  const completion = await openai.chat.completions.create(params)
  const content = completion.choices[0]?.message?.content
  if (typeof content === 'string' && content.length > 0) {
    setLlmResponseCache(key, content)
  }
  return completion
}
