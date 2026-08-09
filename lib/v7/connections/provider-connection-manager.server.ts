import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { disconnectIntegration, upsertIntegrationConnection } from '@/lib/integrations/integration-auth'
import {
  hasEnvProviderCredentials,
} from '@/lib/v7/connections/provider-credentials.server'
import { validateProviderApiKey } from '@/lib/v7/connections/provider-connection-validate.server'
import type {
  ManagedVideoProviderId,
  ProviderConnectionRecord,
  ProviderConnectionState,
  ProviderPreflightReport,
} from '@/lib/v7/connections/provider-connection.types'
import {
  ProviderManager,
  type ProviderPreflightResult,
} from '@/lib/v7/providers/provider-manager.server'
import {
  MANAGED_VIDEO_PROVIDER_DEFINITIONS,
  getManagedProviderDefinition,
  managedIdFromRegistryId,
} from '@/lib/v7/connections/provider-connection-registry.server'
import { invalidateOpenArtMcpCatalogCache } from '@/lib/openart/mcp-catalog.server'
import { invalidateVideoProviderCapabilityCache } from '@/lib/v7/providers/video-capability.server'
import type { V7VideoProviderCapabilityReason } from '@/lib/v7/providers/video-provider.types'

function mapReasonToState(params: {
  available: boolean
  connected: boolean
  authenticated: boolean
  healthy: boolean
  reason?: V7VideoProviderCapabilityReason
  message?: string
}): { state: ProviderConnectionState; action: string | null } {
  if (params.available) {
    return { state: 'READY', action: null }
  }

  const reason = params.reason
  const message = (params.message ?? '').toLowerCase()

  if (reason === 'MODEL_NOT_ENABLED' || reason === 'MODEL_NOT_AVAILABLE') {
    return {
      state: 'MODEL_NOT_ENABLED',
      action: 'Enable or purchase the required model in the provider console.',
    }
  }
  if (reason === 'NOT_CONFIGURED' || !params.connected) {
    return {
      state: params.connected ? 'INVALID_CONFIGURATION' : 'NOT_CONFIGURED',
      action: 'Add credentials in Provider Manager or set the required environment variables.',
    }
  }
  if (reason === 'NOT_AUTHENTICATED' || !params.authenticated) {
    return {
      state: 'NOT_AUTHENTICATED',
      action: 'Complete OAuth or enter a valid API key.',
    }
  }
  if (reason === 'UNHEALTHY' || !params.healthy) {
    return {
      state: 'OFFLINE',
      action: 'Check provider status and retry the connection.',
    }
  }
  if (message.includes('rate limit')) {
    return { state: 'RATE_LIMITED', action: 'Wait and retry, or switch providers.' }
  }
  if (message.includes('quota')) {
    return { state: 'QUOTA_EXCEEDED', action: 'Upgrade the provider plan or add credits.' }
  }

  return {
    state: 'UNAVAILABLE',
    action: params.message ?? 'Provider is unavailable for scene video generation.',
  }
}

function buildConnectionRecord(params: {
  definition: (typeof MANAGED_VIDEO_PROVIDER_DEFINITIONS)[number]
  evaluation: {
    available: boolean
    reason?: V7VideoProviderCapabilityReason
    message?: string
    latencyMs?: number
    models?: string[]
    entitledModels?: string[]
  }
  connected: boolean
  authenticated: boolean
  healthy: boolean
}): ProviderConnectionRecord {
  const { state, action } = mapReasonToState({
    available: params.evaluation.available,
    connected: params.connected,
    authenticated: params.authenticated,
    healthy: params.healthy,
    reason: params.evaluation.reason,
    message: params.evaluation.message,
  })

  const model =
    params.evaluation.entitledModels?.[0] ??
    params.evaluation.models?.[0] ??
    params.definition.defaultModel ??
    null

  return {
    id: params.definition.id,
    connected: params.connected,
    authenticated: params.authenticated,
    healthy: params.healthy,
    available: params.evaluation.available,
    state,
    model,
    reason: params.evaluation.available ? null : state,
    action: action ?? params.definition.connectAction,
    latencyMs: params.evaluation.latencyMs ?? null,
    connectUrl: params.definition.connectUrl ?? null,
    authType: params.definition.authType,
    priority: params.definition.priority,
  }
}

export async function listVideoProviderConnections(params: {
  userId: string
  supabase?: SupabaseClient
  preflight?: ProviderPreflightResult
}): Promise<ProviderConnectionRecord[]> {
  const preflight = params.preflight ?? (await ProviderManager.preflight(params))
  const records: ProviderConnectionRecord[] = []

  for (const definition of MANAGED_VIDEO_PROVIDER_DEFINITIONS) {
    if (definition.id === 'pollinations') {
      const video = preflight.providers.video
      const image = preflight.providers.image
      records.push(
        buildConnectionRecord({
          definition,
          evaluation: {
            available: video.ready && image.ready,
            reason: video.ready && image.ready ? undefined : 'NOT_CONFIGURED',
            message: video.reason ?? image.reason ?? undefined,
            models: video.selectedModel ? [video.selectedModel] : image.selectedModel ? [image.selectedModel] : undefined,
          },
          connected: video.connected && image.connected,
          authenticated: video.authenticated && image.authenticated,
          healthy: video.healthy && image.healthy,
        })
      )
    }
  }

  return records
}

export async function runVideoProviderPreflight(params: {
  userId: string
  supabase?: SupabaseClient
}): Promise<ProviderPreflightReport> {
  const report = await ProviderManager.preflight(params)

  const providers = await listVideoProviderConnections({ ...params, preflight: report })

  return {
    ready: report.video === 'READY' && report.image === 'READY',
    selectedProvider: report.video === 'READY' ? 'pollinations' : null,
    providers,
    error: report.video === 'READY' ? null : 'VIDEO_PROVIDER_NOT_READY',
    modalities: {
      text: report.text,
      image: report.image,
      video: report.video,
    },
    providerHealth: report.providers,
  }
}

export async function runUnifiedProviderPreflight(params: {
  userId: string
  supabase?: SupabaseClient
  productionId?: string
}) {
  return ProviderManager.preflight(params)
}

export async function connectProviderWithApiKey(params: {
  supabase: SupabaseClient
  userId: string
  providerId: ManagedVideoProviderId
  apiKey: string
}): Promise<{ record: ProviderConnectionRecord; validation: Awaited<ReturnType<typeof validateProviderApiKey>> }> {
  const definition = getManagedProviderDefinition(params.providerId)
  if (!definition) throw new Error(`Unknown provider: ${params.providerId}`)
  if (definition.authType === 'oauth') {
    throw new Error(`${definition.displayName} requires OAuth. Use ${definition.connectUrl ?? '/api/openart/auth'}.`)
  }
  if (definition.authType === 'endpoint') {
    throw new Error(`${definition.displayName} is configured via deployment environment variables.`)
  }

  const validation = await validateProviderApiKey(params.providerId, params.apiKey)
  if (!validation.valid) {
    return {
      validation,
      record: buildConnectionRecord({
        definition,
        evaluation: {
          available: false,
          reason: 'NOT_AUTHENTICATED',
          message: validation.message,
        },
        connected: false,
        authenticated: validation.authenticated,
        healthy: validation.healthy,
      }),
    }
  }

  await upsertIntegrationConnection(params.supabase, params.userId, definition.integrationProvider, {
    status: 'connected',
    tokens: {
      api_key: params.apiKey.trim(),
      connectedAt: new Date().toISOString(),
      source: 'provider_manager',
    },
    metadata: {
      providerId: params.providerId,
      validatedAt: new Date().toISOString(),
      latencyMs: validation.latencyMs ?? null,
    },
  })

  invalidateVideoProviderCapabilityCache(definition.registryId, params.userId)

  const [record] = await listVideoProviderConnections({
    userId: params.userId,
    supabase: params.supabase,
  }).then((entries) => entries.filter((entry) => entry.id === params.providerId))

  return {
    validation,
    record:
      record ??
      buildConnectionRecord({
        definition,
        evaluation: { available: true, models: validation.models },
        connected: true,
        authenticated: true,
        healthy: true,
      }),
  }
}

export async function disconnectManagedProvider(params: {
  supabase: SupabaseClient
  userId: string
  providerId: ManagedVideoProviderId
}): Promise<boolean> {
  const definition = getManagedProviderDefinition(params.providerId)
  if (!definition) return false

  if (definition.id === 'openart') {
    await disconnectIntegration(params.supabase, params.userId, definition.integrationProvider)
    invalidateOpenArtMcpCatalogCache(params.userId)
    invalidateVideoProviderCapabilityCache(definition.registryId, params.userId)
    return true
  }

  if (definition.authType === 'endpoint') {
    return false
  }

  if (hasEnvProviderCredentials(definition) && definition.authType === 'api_key') {
    return false
  }

  const ok = await disconnectIntegration(params.supabase, params.userId, definition.integrationProvider)
  invalidateVideoProviderCapabilityCache(definition.registryId, params.userId)
  return ok
}

export function toPublicProviderList(records: ProviderConnectionRecord[]) {
  return records.map((entry) => ({
    id: entry.id,
    connected: entry.connected,
    authenticated: entry.authenticated,
    healthy: entry.healthy,
    available: entry.available,
    state: entry.state,
    model: entry.model,
    reason: entry.reason,
    action: entry.action,
    latencyMs: entry.latencyMs ?? null,
    connectUrl: entry.connectUrl ?? null,
    authType: entry.authType,
    priority: entry.priority,
  }))
}

export { managedIdFromRegistryId }
