import type {
  ProviderAttemptLog,
  ProviderResultLog,
  RouterDecisionLog,
} from '@/lib/ai/providers/provider-diagnostics.types'
export function logAIProviderAttempt(entry: ProviderAttemptLog): void {
  console.info('[AI_PROVIDER_ATTEMPT]', JSON.stringify(entry))
}

export function logAIProviderResult(entry: ProviderResultLog): void {
  console.info('[AI_PROVIDER_RESULT]', JSON.stringify(entry))
}

export function logAIRouter(entry: RouterDecisionLog): void {
  console.info('[AI_ROUTER]', JSON.stringify(entry))
}

export function newProviderRequestId(): string {
  return crypto.randomUUID().slice(0, 12)
}
export function logAIProviderConfig(
  entries: Array<{
    provider: string
    configured: boolean
    keyPresent: boolean
    model: string
    enabled: boolean
  }>
): void {
  for (const entry of entries) {
    console.info('[AI_PROVIDER_CONFIG]', JSON.stringify(entry))
  }
}
