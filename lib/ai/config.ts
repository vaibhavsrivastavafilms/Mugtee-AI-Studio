import 'server-only'

import { TextProviderNotConfiguredError } from '@/lib/ai/errors'
import { hasOpenRouterApiKey } from '@/lib/ai/providers/openrouter/client'
import { initializeOpenRouter } from '@/lib/ai/providers/openrouter/router'

export const OPENROUTER_CHAT_COMPLETIONS_URL =
  'https://openrouter.ai/api/v1/chat/completions'

export type ActiveTextProviderId = 'openrouter'

export function resolveActiveTextProvider(): ActiveTextProviderId {
  return 'openrouter'
}

export function assertActiveTextProviderConfigured(): ActiveTextProviderId {
  if (!hasOpenRouterApiKey()) {
    throw new TextProviderNotConfiguredError(
      'OPENROUTER_API_KEY is required for text generation'
    )
  }
  return 'openrouter'
}

export async function validateTextProviderOnStartup(): Promise<void> {
  if (!hasOpenRouterApiKey()) {
    console.warn('[openrouter] OPENROUTER_API_KEY is not configured — text generation disabled')
    return
  }

  try {
    await initializeOpenRouter()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[openrouter] Startup initialization failed: ${message}`)
  }
}
