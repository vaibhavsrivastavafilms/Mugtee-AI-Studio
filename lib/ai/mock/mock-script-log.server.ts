import type { ProviderFailureSummary } from '@/lib/ai/providers/provider-diagnostics.types'
import type { ProviderId } from '@/lib/ai/providers/types'

export type MockScriptLogReason =
  | 'all_providers_failed'
  | 'providers_in_cooldown'
  | 'missing_api_key'
  | 'provider_mock_fallback'
  | 'development_mock'
  | 'forced_mock'

export type MockScriptLogEntry = {
  enabled: boolean
  reason: MockScriptLogReason
  providerFailures: string[]
  durationMs: number
}

export function logMockScript(entry: MockScriptLogEntry): void {
  console.info('[MOCK_SCRIPT]', JSON.stringify(entry))
}

export function providerIdsFromFailures(
  failures: ProviderFailureSummary[] | undefined
): ProviderId[] {
  if (!failures?.length) return []
  return failures.map((f) => f.provider)
}
