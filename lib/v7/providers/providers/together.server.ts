import 'server-only'

import { createOpenAiCompatibleV7Provider } from '@/lib/v7/providers/openai-compatible.server'
import type { V7TextProvider } from '@/lib/v7/providers/text-provider.types'

const TOGETHER_BASE = 'https://api.together.xyz/v1'

function togetherKey(): string | null {
  return process.env.TOGETHER_API_KEY?.trim() || null
}

const TOGETHER_MODELS = [
  process.env.V7_TOGETHER_MODEL?.trim() ||
    process.env.TOGETHER_CHAT_MODEL?.trim() ||
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
  'deepseek-ai/DeepSeek-V3',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'google/gemma-3-27b-it',
  'mistralai/Mistral-Small-Instruct-2409',
]

function uniqueModels(): string[] {
  const seen = new Set<string>()
  return TOGETHER_MODELS.filter((m) => {
    if (!m || seen.has(m)) return false
    seen.add(m)
    return true
  })
}

/** Together provider tries multiple models internally before failing the slot. */
export function createTogetherProvider(): V7TextProvider {
  const models = uniqueModels()
  const primary = createOpenAiCompatibleV7Provider({
    id: 'together',
    displayName: 'Together',
    model: models[0] ?? 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    baseUrl: TOGETHER_BASE,
    getApiKey: togetherKey,
    defaultTimeoutMs: 90_000,
  })

  const fallbacks = models.slice(1).map((model) =>
    createOpenAiCompatibleV7Provider({
      id: 'together',
      displayName: 'Together',
      model,
      baseUrl: TOGETHER_BASE,
      getApiKey: togetherKey,
      defaultTimeoutMs: 90_000,
    })
  )

  return {
    id: 'together',
    displayName: 'Together',
    supports: (input) => primary.supports(input),
    validateInput: (input) => primary.validateInput(input),
    health: () => primary.health(),
    estimateCost: (input) => primary.estimateCost(input),
    estimateTime: (input) => primary.estimateTime(input),
    normalizeOutput: (raw) => primary.normalizeOutput(raw),
    cancel: () => {
      primary.cancel()
      fallbacks.forEach((f) => f.cancel())
    },
    cleanup: () => {
      primary.cleanup()
      fallbacks.forEach((f) => f.cleanup())
    },
    retry: (input, previous) => primary.retry(input, previous),
    async generate(input) {
      let lastError: unknown
      for (const provider of [primary, ...fallbacks]) {
        if (!provider.supports(input)) continue
        try {
          return await provider.generate(input)
        } catch (err) {
          lastError = err
        }
      }
      throw lastError
    },
  }
}

export const togetherProvider = createTogetherProvider()
