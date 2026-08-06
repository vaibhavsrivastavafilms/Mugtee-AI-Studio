import 'server-only'

import { createOpenAiCompatibleV7Provider } from '@/lib/v7/providers/openai-compatible.server'
import type { V7TextProvider } from '@/lib/v7/providers/text-provider.types'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function openRouterHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const referer = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (referer) headers['HTTP-Referer'] = referer
  headers['X-Title'] = 'Mugtee AI Studio'
  return headers
}

function openRouterKey(): string | null {
  return process.env.OPENROUTER_API_KEY?.trim() || null
}

function primaryModel(): string {
  return (
    process.env.V7_OPENROUTER_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'qwen/qwen3-235b-a22b'
  )
}

function fallbackModel(): string {
  return (
    process.env.V7_OPENROUTER_FALLBACK_MODEL?.trim() ||
    process.env.OPENROUTER_SCRIPT_MODEL?.trim() ||
    'deepseek/deepseek-chat-v3-0324'
  )
}

const qwenCore = createOpenAiCompatibleV7Provider({
  id: 'openrouter-qwen',
  displayName: 'OpenRouter',
  model: primaryModel(),
  baseUrl: OPENROUTER_BASE,
  getApiKey: openRouterKey,
  extraHeaders: openRouterHeaders,
})

const deepseekCore = createOpenAiCompatibleV7Provider({
  id: 'openrouter-deepseek',
  displayName: 'OpenRouter',
  model: fallbackModel(),
  baseUrl: OPENROUTER_BASE,
  getApiKey: openRouterKey,
  extraHeaders: openRouterHeaders,
})

export const openRouterQwenProvider: V7TextProvider = qwenCore
export const openRouterDeepSeekProvider: V7TextProvider = deepseekCore
