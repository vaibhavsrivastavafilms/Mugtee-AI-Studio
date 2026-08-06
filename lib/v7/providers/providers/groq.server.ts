import 'server-only'

import { createOpenAiCompatibleV7Provider } from '@/lib/v7/providers/openai-compatible.server'
import type { V7TextProvider } from '@/lib/v7/providers/text-provider.types'

const GROQ_BASE = 'https://api.groq.com/openai/v1'

function groqKey(): string | null {
  return process.env.GROQ_API_KEY?.trim() || null
}

function groqModel(): string {
  return (
    process.env.V7_GROQ_MODEL?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    'llama-3.3-70b-versatile'
  )
}

const groqCore = createOpenAiCompatibleV7Provider({
  id: 'groq',
  displayName: 'Groq',
  model: groqModel(),
  baseUrl: GROQ_BASE,
  getApiKey: groqKey,
  defaultTimeoutMs: 45_000,
})

export const groqProvider: V7TextProvider = groqCore

/** Secondary Groq model attempted inside the groq slot when primary model fails. */
export function groqFallbackModel(): string {
  return process.env.V7_GROQ_FALLBACK_MODEL?.trim() || 'deepseek-r1-distill-llama-70b'
}

export const groqFallbackProvider: V7TextProvider = createOpenAiCompatibleV7Provider({
  id: 'groq',
  displayName: 'Groq',
  model: groqFallbackModel(),
  baseUrl: GROQ_BASE,
  getApiKey: groqKey,
  defaultTimeoutMs: 45_000,
})
