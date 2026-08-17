import 'server-only'

import { TextProviderNotConfiguredError } from '@/lib/ai/errors'
import { hasOpenRouterApiKey } from '@/lib/ai/providers/openrouter/client'
import { initializeOpenRouter } from '@/lib/ai/providers/openrouter/router'
import { getAvailableProviders, hasProviderKey } from '@/lib/ai/providers/task-routing'
import { readPollinationsApiKeyFromEnv } from '@/lib/pollinations/key-diagnostics-core'

export const OPENROUTER_CHAT_COMPLETIONS_URL =
  'https://openrouter.ai/api/v1/chat/completions'

export type ActiveTextProviderId = 'pollinations' | 'openrouter'

export function resolveActiveTextProvider(): ActiveTextProviderId {
  return hasProviderKey('pollinations') ? 'pollinations' : 'openrouter'
}

export function assertActiveTextProviderConfigured(): ActiveTextProviderId {
  if (getAvailableProviders().length === 0) {
    throw new TextProviderNotConfiguredError(
      'At least one text provider API key is required (Pollinations, OpenRouter, Gemini, Groq, etc.)'
    )
  }
  return resolveActiveTextProvider()
}

export async function validateTextProviderOnStartup(): Promise<void> {
  if (readPollinationsApiKeyFromEnv()) {
    console.info('[pollinations] POLLINATIONS_API_KEY configured — primary text provider')
  } else if (!hasOpenRouterApiKey()) {
    console.warn('[text] No Pollinations or OpenRouter key — text generation disabled')
    return
  }

  if (hasOpenRouterApiKey()) {
    try {
      await initializeOpenRouter()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[openrouter] Startup initialization failed: ${message}`)
    }
  }
}
