import type { AITask, ProviderId } from '@/lib/ai/providers/types'

type HealthEntry = {
  lastSuccessAt?: number
  lastFailureAt?: number
  lastError?: string
  consecutiveFailures: number
}

const health = new Map<string, HealthEntry>()

function key(provider: ProviderId, task?: AITask): string {
  return task ? `${provider}:${task}` : provider
}

function getEntry(provider: ProviderId, task?: AITask): HealthEntry {
  const k = key(provider, task)
  let entry = health.get(k)
  if (!entry) {
    entry = { consecutiveFailures: 0 }
    health.set(k, entry)
  }
  return entry
}

export function recordProviderSuccess(provider: ProviderId, task?: AITask): void {
  const entry = getEntry(provider, task)
  entry.lastSuccessAt = Date.now()
  entry.consecutiveFailures = 0
  entry.lastError = undefined
}

export function recordProviderFailure(
  provider: ProviderId,
  error: string,
  task?: AITask
): void {
  const entry = getEntry(provider, task)
  entry.lastFailureAt = Date.now()
  entry.lastError = error.slice(0, 240)
  entry.consecutiveFailures += 1
  console.warn(`[ai-router] ${provider}${task ? `:${task}` : ''} failed: ${entry.lastError}`)
}

export function isProviderHealthy(provider: ProviderId, task?: AITask): boolean {
  const entry = getEntry(provider, task)
  if (!entry.lastFailureAt) return true
  if (entry.consecutiveFailures < 3) return true
  // Cool down for 5 minutes after 3+ consecutive failures
  return Date.now() - entry.lastFailureAt > 5 * 60 * 1000
}

export type ProviderHealthSnapshot = {
  provider: ProviderId
  task?: AITask
  lastSuccessAt?: number
  lastFailureAt?: number
  lastError?: string
  consecutiveFailures: number
  healthy: boolean
}

export function getProviderHealthSnapshot(): ProviderHealthSnapshot[] {
  const out: ProviderHealthSnapshot[] = []
  for (const [k, entry] of health.entries()) {
    const [provider, task] = k.split(':') as [ProviderId, AITask | undefined]
    out.push({
      provider,
      task: task || undefined,
      lastSuccessAt: entry.lastSuccessAt,
      lastFailureAt: entry.lastFailureAt,
      lastError: entry.lastError,
      consecutiveFailures: entry.consecutiveFailures,
      healthy: isProviderHealthy(provider, task),
    })
  }
  return out
}

export function resetProviderHealth(): void {
  health.clear()
}
