import 'server-only'

import { TextProviderError } from '@/lib/ai/errors'

export const OPENROUTER_CHAT_COMPLETIONS_URL =
  'https://openrouter.ai/api/v1/chat/completions'

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) {
    throw new TextProviderError('OPENROUTER_AUTH_FAILED', 'openrouter', {
      message: 'OPENROUTER_API_KEY is not configured',
    })
  }
  return key
}

export function hasOpenRouterApiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

export function getOpenRouterHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
  }

  const referer = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (referer) headers['HTTP-Referer'] = referer

  const title = process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Mugtee AI Studio'
  headers['X-Title'] = title

  return headers
}
