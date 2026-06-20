import type { ProviderId } from '@/lib/ai/providers/types'
import { hasProviderKey, getProviderAttemptOrder } from '@/lib/ai/providers/task-routing'
import { logAIProviderConfig } from '@/lib/ai/providers/trace.server'
import {
  isScriptGenerationMockEnabled,
  isScriptMockFallbackEnabled,
} from '@/lib/ai/mock/mock-script-mode.server'

export { isScriptGenerationMockEnabled, isScriptMockFallbackEnabled }

const MODEL_ENV: Record<ProviderId, string[]> = {
  openai: ['OPENAI_MODEL', 'OPENAI_CHAT_MODEL'],
  gemini: ['GEMINI_MODEL', 'GOOGLE_GEMINI_MODEL'],
  groq: ['GROQ_MODEL'],
  openrouter: ['OPENROUTER_MODEL', 'OPENROUTER_SCRIPT_MODEL'],
  deepseek: ['DEEPSEEK_MODEL'],
}

const DEFAULT_MODEL: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'google/gemini-2.0-flash-001',
  deepseek: 'deepseek-chat',
}

export function getProviderModel(id: ProviderId): string {
  for (const key of MODEL_ENV[id]) {
    const v = process.env[key]?.trim()
    if (v) return v
  }
  return DEFAULT_MODEL[id]
}

export type ProviderConfigEntry = {
  provider: ProviderId
  configured: boolean
  keyPresent: boolean
  model: string
  enabled: boolean
}

export function getProviderConfigSnapshot(): ProviderConfigEntry[] {
  const ids: ProviderId[] = ['openai', 'gemini', 'groq', 'openrouter', 'deepseek']
  return ids.map((provider) => {
    const keyPresent = hasProviderKey(provider)
    return {
      provider,
      configured: keyPresent,
      keyPresent,
      model: getProviderModel(provider),
      enabled: keyPresent,
    }
  })
}

export function logProviderConfigOnStartup(): void {
  logAIProviderConfig(getProviderConfigSnapshot())
}

export function providersInScriptOrder(): ProviderId[] {
  return getProviderAttemptOrder('script')
}
