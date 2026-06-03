import { createStubIntegration } from '@/lib/integrations/stub-integration'
import type { IntegrationCategory, MugteeIntegration } from '@/lib/integrations/types'
import { OpenAIProvider } from '@/lib/ai/providers/providers/openai-provider'
import { GeminiProvider } from '@/lib/ai/providers/providers/gemini-provider'
import { OpenRouterProvider } from '@/lib/ai/providers/providers/openrouter-provider'

const SOCIAL = ['instagram', 'facebook', 'youtube', 'linkedin', 'x', 'tiktok'] as const
const STORAGE = ['google_drive', 'dropbox', 'onedrive'] as const
const PRODUCTIVITY = ['notion', 'airtable', 'slack', 'discord'] as const
const CREATIVE = ['adobe', 'canva', 'figma', 'frame_io'] as const
const AI_STUB = ['anthropic', 'mistral'] as const

function stubList(
  ids: readonly string[],
  category: IntegrationCategory,
  labelFn: (id: string) => string
): MugteeIntegration[] {
  return ids.map((id) =>
    createStubIntegration({
      id,
      provider: id,
      name: labelFn(id),
      category,
    })
  )
}

function aiBridgeIntegration(
  id: string,
  name: string,
  providerId: 'openai' | 'gemini' | 'openrouter'
): MugteeIntegration {
  const instances = {
    openai: new OpenAIProvider(),
    gemini: new GeminiProvider(),
    openrouter: new OpenRouterProvider(),
  }
  const instance = instances[providerId]
  return {
    id,
    name,
    provider: id,
    category: 'ai',
    async connect() {
      if (!instance.isAvailable()) {
        throw new Error(`${name} API key not configured`)
      }
    },
    async execute(action: string, args: Record<string, unknown>) {
      if (!instance.isAvailable()) {
        return { ok: false, stub: true, provider: id, action, error: 'API key missing' }
      }
      return {
        ok: true,
        stub: false,
        provider: id,
        action,
        available: true,
        modelHint: args.model ?? 'default',
      }
    },
    async disconnect() {
      return undefined
    },
  }
}

const REGISTRY = new Map<string, MugteeIntegration>()

function register(integration: MugteeIntegration) {
  REGISTRY.set(integration.provider, integration)
}

export function bootstrapIntegrationRegistry() {
  if (REGISTRY.size > 0) return REGISTRY

  for (const i of stubList(SOCIAL, 'social', (id) => id.replace(/_/g, ' '))) register(i)
  for (const i of stubList(STORAGE, 'storage', (id) => id.replace(/_/g, ' '))) register(i)
  for (const i of stubList(PRODUCTIVITY, 'productivity', (id) => id.replace(/_/g, ' '))) register(i)
  for (const i of stubList(CREATIVE, 'creative', (id) => id.replace(/_/g, ' '))) register(i)
  for (const i of stubList(AI_STUB, 'ai', (id) => id.replace(/_/g, ' '))) register(i)

  register(aiBridgeIntegration('openai', 'OpenAI', 'openai'))
  register(aiBridgeIntegration('google', 'Google AI', 'gemini'))
  register(aiBridgeIntegration('openrouter', 'OpenRouter', 'openrouter'))

  return REGISTRY
}

export function getIntegration(provider: string): MugteeIntegration | undefined {
  bootstrapIntegrationRegistry()
  return REGISTRY.get(provider)
}

export function listIntegrations(): MugteeIntegration[] {
  bootstrapIntegrationRegistry()
  return [...REGISTRY.values()]
}

export function listIntegrationsByCategory(category: IntegrationCategory): MugteeIntegration[] {
  return listIntegrations().filter((i) => i.category === category)
}
