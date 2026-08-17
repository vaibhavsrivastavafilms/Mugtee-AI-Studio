import 'server-only'

import { assertActiveTextProviderConfigured } from '@/lib/ai/config'
import { TextProviderError, type ActiveTextProviderId } from '@/lib/ai/errors'
import { openRouterGenerateContent } from '@/lib/ai/providers/openrouter/generate'

export type TextGenerateRequest = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  projectId?: string
  agent?: string
  timeoutMs?: number
  maxModelAttempts?: number
}

export type TextGenerateResult = {
  text: string
  provider: ActiveTextProviderId
  model: string
  promptTokens?: number
  completionTokens?: number
  latencyMs: number
  retryCount: number
}

export interface TextProvider {
  readonly id: ActiveTextProviderId
  generate(
    request: TextGenerateRequest
  ): Promise<Omit<TextGenerateResult, 'latencyMs' | 'retryCount'>>
}

class OpenRouterTextProvider implements TextProvider {
  readonly id = 'openrouter' as const

  async generate(
    request: TextGenerateRequest
  ): Promise<Omit<TextGenerateResult, 'latencyMs' | 'retryCount'>> {
    const result = await openRouterGenerateContent({
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      temperature: request.temperature,
      timeoutMs: request.timeoutMs,
      maxModelAttempts: request.maxModelAttempts,
    })

    return {
      text: result.text,
      provider: this.id,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    }
  }
}

let cachedProvider: OpenRouterTextProvider | null = null

export function createTextProvider(): TextProvider {
  assertActiveTextProviderConfigured()
  if (!cachedProvider) cachedProvider = new OpenRouterTextProvider()
  return cachedProvider
}

export async function generateText(request: TextGenerateRequest): Promise<TextGenerateResult> {
  const provider = createTextProvider()
  const started = Date.now()

  try {
    const partial = await provider.generate(request)
    return {
      ...partial,
      latencyMs: Date.now() - started,
      retryCount: 0,
    }
  } catch (err) {
    if (err instanceof TextProviderError) {
      console.error('[openrouter] text generation failed', {
        agent: request.agent ?? null,
        error: err.code,
        model: err.model ?? null,
        attempted: err.attemptedModels ?? null,
      })
    }
    throw err
  }
}
