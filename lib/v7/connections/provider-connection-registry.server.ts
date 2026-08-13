import 'server-only'

import type { V7VideoProviderId } from '@/lib/v7/providers/video-provider.types'
import type { ManagedVideoProviderId, ProviderAuthType } from '@/lib/v7/connections/provider-connection.types'

export type ManagedVideoProviderDefinition = {
  id: ManagedVideoProviderId
  registryId: V7VideoProviderId
  integrationProvider: string
  authType: ProviderAuthType
  displayName: string
  priority: number
  connectUrl?: string
  envKeys: string[]
  defaultModel?: string
  connectAction: string
}

/** Active production providers — Pollinations media only. Legacy adapters remain in repo but unregistered. */
export const MANAGED_VIDEO_PROVIDER_DEFINITIONS: ManagedVideoProviderDefinition[] = [
  {
    id: 'pollinations',
    registryId: 'pollinations',
    integrationProvider: 'pollinations_media',
    authType: 'oauth',
    displayName: 'Pollinations',
    priority: 1,
    connectUrl: '/api/auth/pollinations/start?redirect=/settings',
    envKeys: ['POLLINATIONS_API_KEY', 'POLLINATIONS_APP_KEY'],
    defaultModel: 'discovered',
    connectAction: 'Connect your Pollinations account (BYOP) or set POLLINATIONS_API_KEY for platform fallback.',
  },
]

export function getManagedProviderDefinition(
  id: ManagedVideoProviderId
): ManagedVideoProviderDefinition | undefined {
  return MANAGED_VIDEO_PROVIDER_DEFINITIONS.find((entry) => entry.id === id)
}

export function managedIdFromRegistryId(registryId: V7VideoProviderId): ManagedVideoProviderId {
  const match = MANAGED_VIDEO_PROVIDER_DEFINITIONS.find((entry) => entry.registryId === registryId)
  return match?.id ?? (registryId === 'pollinations' ? 'pollinations' : (registryId as ManagedVideoProviderId))
}
