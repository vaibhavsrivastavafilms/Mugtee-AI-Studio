import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidRunwayApiKeyFormat } from '@/lib/ai/runway-video'
import { getIntegrationTokens } from '@/lib/integrations/integration-auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  getManagedProviderDefinition,
  type ManagedVideoProviderDefinition,
} from '@/lib/v7/connections/provider-connection-registry.server'
import type { ManagedVideoProviderId } from '@/lib/v7/connections/provider-connection.types'
import { hasSeedanceApiKey } from '@/lib/video-providers/seedance-client'
import { getWanVideoApiKey, hasWanVideoApiKey } from '@/lib/video-providers/wan-video-client'

function readStoredApiKey(tokens: Record<string, unknown> | null): string | undefined {
  if (!tokens) return undefined
  const candidates = [tokens.api_key, tokens.apiKey, tokens.access_token, tokens.accessToken]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

export function hasEnvProviderCredentials(definition: ManagedVideoProviderDefinition): boolean {
  if (definition.id === 'wan') return hasWanVideoApiKey()
  if (definition.id === 'seedance') return hasSeedanceApiKey()
  if (definition.id === 'runway') {
    const key =
      process.env.RUNWAY_API_KEY?.trim() || process.env.RUNWAYML_API_SECRET?.trim() || undefined
    return Boolean(key && isValidRunwayApiKeyFormat(key))
  }
  if (definition.id === 'openart') {
    return false
  }
  return definition.envKeys.some((key) => Boolean(process.env[key]?.trim()))
}

/** Request-scoped client when available; otherwise service role for credential lookups. */
export async function resolveSupabaseForProviderCredentials(
  supabase?: SupabaseClient
): Promise<SupabaseClient | undefined> {
  if (supabase) return supabase

  try {
    return await createSupabaseServerClient()
  } catch {
    return createSupabaseServiceClient() ?? undefined
  }
}

export async function resolveProviderApiKey(
  providerId: ManagedVideoProviderId,
  userId?: string,
  supabase?: SupabaseClient
): Promise<string | undefined> {
  const definition = getManagedProviderDefinition(providerId)
  if (!definition) return undefined

  if (definition.id === 'wan') {
    const envKey = getWanVideoApiKey()
    if (envKey) return envKey
  } else if (definition.id === 'seedance' && hasSeedanceApiKey()) {
    return process.env.SEEDANCE_API_KEY?.trim()
  } else if (definition.id === 'runway') {
    const envKey =
      process.env.RUNWAY_API_KEY?.trim() || process.env.RUNWAYML_API_SECRET?.trim() || undefined
    if (envKey && isValidRunwayApiKeyFormat(envKey)) return envKey
  } else if (definition.id === 'openart') {
    const envToken = process.env.OPENART_MCP_ACCESS_TOKEN?.trim()
    if (envToken) return envToken
    if (userId?.trim()) {
      const { getOpenArtAccessTokenForUser } = await import('@/lib/openart/oauth.server')
      return (await getOpenArtAccessTokenForUser(userId)) ?? undefined
    }
    return undefined
  } else {
    const primary = definition.envKeys.find((key) => process.env[key]?.trim())
    if (primary) return process.env[primary]?.trim()
  }

  if (!userId || !supabase) return undefined

  const tokens = await getIntegrationTokens(supabase, userId, definition.integrationProvider)
  return readStoredApiKey(tokens)
}

export async function isProviderConnected(
  providerId: ManagedVideoProviderId,
  userId: string | undefined,
  supabase: SupabaseClient | undefined
): Promise<boolean> {
  const definition = getManagedProviderDefinition(providerId)
  if (!definition) return false

  if (hasEnvProviderCredentials(definition)) return true

  if (providerId === 'openart' && userId && supabase) {
    const { isOpenArtMcpConnected } = await import('@/lib/openart/oauth.server')
    if (await isOpenArtMcpConnected(userId)) return true
  }

  if (!userId || !supabase) return false
  const key = await resolveProviderApiKey(providerId, userId, supabase)
  return Boolean(key)
}
