import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getIntegrationTokens } from '@/lib/integrations/integration-auth'
import { POLLINATIONS_INTEGRATION_PROVIDER } from '@/lib/pollinations/constants.server'
import { PollinationsError } from '@/lib/pollinations/errors.server'
import { readPollinationsApiKeyFromEnv } from '@/lib/pollinations/key-diagnostics-core'
import { resolveSupabaseForProviderCredentials } from '@/lib/v7/connections/provider-credentials.server'

export type PollinationsAuthSource = 'user_byop' | 'platform_env'

export type PollinationsAuthContext = {
  apiKey: string
  source: PollinationsAuthSource
  userId?: string
}

type StoredPollinationsTokens = {
  access_token?: string
  api_key?: string
  expires_at?: string
  source?: string
}

function readStoredAccessToken(tokens: Record<string, unknown> | null): string | undefined {
  if (!tokens) return undefined
  const candidates = [tokens.access_token, tokens.api_key, tokens.apiKey]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().startsWith('sk_')) return value.trim()
  }
  return undefined
}

function isTokenExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt?.trim()) return false
  const ms = Date.parse(expiresAt)
  if (!Number.isFinite(ms)) return false
  return ms <= Date.now()
}

export async function userHasPollinationsByopConnection(params: {
  userId: string
  supabase: SupabaseClient
}): Promise<boolean> {
  const tokens = await getIntegrationTokens(params.supabase, params.userId, POLLINATIONS_INTEGRATION_PROVIDER)
  return Boolean(readStoredAccessToken(tokens))
}

/**
 * Resolve Pollinations credentials for a generation request.
 *
 * Priority:
 * 1. User BYOP connection (never falls back to platform key when connected)
 * 2. Platform POLLINATIONS_API_KEY (server deployment fallback)
 */
export async function resolvePollinationsAuthContext(params: {
  userId?: string
  supabase?: SupabaseClient
}): Promise<PollinationsAuthContext> {
  const supabase =
    params.supabase ?? (await resolveSupabaseForProviderCredentials())

  if (params.userId?.trim() && supabase) {
    const tokens = (await getIntegrationTokens(
      supabase,
      params.userId.trim(),
      POLLINATIONS_INTEGRATION_PROVIDER
    )) as StoredPollinationsTokens | null

    const userKey = readStoredAccessToken(tokens)
    if (userKey) {
      if (isTokenExpired(tokens?.expires_at)) {
        throw new PollinationsError({
          code: 'POLLINATIONS_AUTH_FAILED',
          message: 'Your Pollinations connection has expired. Reconnect Pollinations to continue.',
          action: 'Reconnect at Settings → Pollinations',
          retryable: false,
        })
      }
      return { apiKey: userKey, source: 'user_byop', userId: params.userId.trim() }
    }
  }

  const platformKey = readPollinationsApiKeyFromEnv()
  if (platformKey?.startsWith('sk_')) {
    return { apiKey: platformKey, source: 'platform_env' }
  }

  if (params.userId?.trim()) {
    throw new PollinationsError({
      code: 'POLLINATIONS_API_KEY_REQUIRED',
      message: 'Connect your Pollinations account to generate with your own Pollen.',
      action: 'Connect Pollinations in Settings',
      retryable: false,
    })
  }

  throw new PollinationsError({
    code: 'POLLINATIONS_API_KEY_REQUIRED',
    message: 'Pollinations is not configured on this deployment.',
    action: 'Set POLLINATIONS_API_KEY or connect Pollinations',
    retryable: false,
  })
}
