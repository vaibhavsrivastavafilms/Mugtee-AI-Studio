import type { V7VideoProviderCapabilityReason } from '@/lib/v7/providers/video-provider.types'

/** Operational state for Provider Connection Manager — exactly one per provider. */
export type ProviderConnectionState =
  | 'READY'
  | 'CONNECTED'
  | 'AUTHENTICATED'
  | 'NOT_CONNECTED'
  | 'NOT_AUTHENTICATED'
  | 'NOT_CONFIGURED'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_API_KEY'
  | 'MODEL_NOT_ENABLED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'UNAVAILABLE'
  | 'OFFLINE'
  | 'ERROR'

export type ProviderAuthType = 'oauth' | 'api_key' | 'env' | 'endpoint'

export type ManagedVideoProviderId =
  | 'pollinations'
  | 'wan'
  | 'openart'
  | 'seedance'
  | 'runway'
  | 'cogvideox'
  | 'hunyuan'
  | 'mochi'
  | 'ltx'
  | 'animatediff'

export type ProviderConnectionRecord = {
  id: ManagedVideoProviderId
  connected: boolean
  authenticated: boolean
  healthy: boolean
  available: boolean
  state: ProviderConnectionState
  model: string | null
  reason: ProviderConnectionState | V7VideoProviderCapabilityReason | null
  action: string | null
  latencyMs?: number | null
  connectUrl?: string | null
  authType: ProviderAuthType
  priority: number
}

export type ProviderPreflightReport = {
  ready: boolean
  selectedProvider: ManagedVideoProviderId | null
  providers: ProviderConnectionRecord[]
  error:
    | 'OPENART_NOT_AUTHENTICATED'
    | 'VIDEO_PROVIDER_NOT_READY'
    | 'IMAGE_PROVIDER_NOT_READY'
    | 'TEXT_PROVIDER_NOT_READY'
    | null
  modalities?: {
    text: 'READY' | 'NOT_READY'
    image: 'READY' | 'NOT_READY'
    video: 'READY' | 'NOT_READY'
  }
  providerHealth?: import('@/lib/v7/providers/provider-manager.server').ProviderPreflightResult['providers']
}
