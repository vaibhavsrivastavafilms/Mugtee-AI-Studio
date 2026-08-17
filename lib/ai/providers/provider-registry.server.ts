import { GeminiProvider } from '@/lib/ai/providers/providers/gemini-provider'
import { GroqProvider } from '@/lib/ai/providers/providers/groq-provider'
import { OpenAIProvider } from '@/lib/ai/providers/providers/openai-provider'
import { OpenRouterProvider } from '@/lib/ai/providers/providers/openrouter-provider'
import { DeepSeekProvider } from '@/lib/ai/providers/providers/deepseek-provider'
import { PollinationsProvider } from '@/lib/ai/providers/providers/pollinations-provider'
import type { AIProvider, ProviderId } from '@/lib/ai/providers/types'

const PROVIDER_INSTANCES: Record<ProviderId, AIProvider> = {
  pollinations: new PollinationsProvider(),
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
  openrouter: new OpenRouterProvider(),
  deepseek: new DeepSeekProvider(),
}

export function getProviderInstance(id: ProviderId): AIProvider {
  return PROVIDER_INSTANCES[id]
}
