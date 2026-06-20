import type { ProviderId } from '@/lib/ai/providers/types'

export type ProviderErrorKind =
  | 'invalid_api_key'
  | 'quota_exceeded'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'malformed_response'
  | 'model_unavailable'
  | 'provider_internal'
  | 'cooldown_skip'
  | 'unconfigured'
  | 'unknown'

export type ProviderFailureSummary = {
  provider: ProviderId
  status: number | null
  reason: string
  errorCode: ProviderErrorKind
  retryable: boolean
  cooldownRemaining?: number
  skipped?: boolean
  latencyMs?: number
}

export type ProviderHealthPublic = {
  healthy: boolean
  cooldown: number
  configured: boolean
  lastError?: string | null
  lastStatus?: number | null
  errorCode?: ProviderErrorKind | null
}

export type ProviderAttemptLog = {
  provider: ProviderId
  model: string
  requestId: string
  startedAt: string
}

export type ProviderResultLog = {
  provider: ProviderId
  success: boolean
  httpStatus: number | null
  latencyMs: number
  tokens: number | null
  finishReason: string | null
  errorCode: ProviderErrorKind | null
  errorMessage: string | null
  retryable: boolean
}

export type RouterDecisionLog = {
  provider: ProviderId
  healthy: boolean
  cooldownRemaining: number
  selected: boolean
  reason: string
}

export function maxRetryAfterSeconds(failures: ProviderFailureSummary[]): number {
  const maxCooldown = failures.reduce(
    (max, f) => Math.max(max, f.cooldownRemaining ?? 0),
    0
  )
  return Math.ceil(maxCooldown / 1000)
}
