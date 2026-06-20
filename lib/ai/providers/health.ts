import type { ProviderErrorKind } from '@/lib/ai/providers/provider-diagnostics.types'
import type { AITask, ProviderId } from '@/lib/ai/providers/types'
import { getProviderConfigSnapshot } from '@/lib/ai/providers/config.server'

type HealthEntry = {
  lastSuccessAt?: number
  lastFailureAt?: number
  lastError?: string
  lastStatus?: number | null
  lastErrorCode?: ProviderErrorKind
  consecutiveFailures: number
  cooldownUntil?: number
  probeScheduled?: boolean
}

const health = new Map<string, HealthEntry>()
const COOLDOWN_THRESHOLD = 3
const BASE_COOLDOWN_MS = 15_000
const MAX_COOLDOWN_MS = 5 * 60 * 1000

function entryKey(provider: ProviderId, task?: AITask): string {
  return task ? `${provider}:${task}` : provider
}

function getEntry(provider: ProviderId, task?: AITask): HealthEntry {
  const k = entryKey(provider, task)
  let entry = health.get(k)
  if (!entry) {
    entry = { consecutiveFailures: 0 }
    health.set(k, entry)
  }
  return entry
}

function cooldownMsForFailures(failures: number): number {
  if (failures < COOLDOWN_THRESHOLD) return 0
  const exponent = Math.min(failures - COOLDOWN_THRESHOLD, 6)
  return Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * Math.pow(2, exponent))
}

function scheduleProbeIfNeeded(provider: ProviderId, task?: AITask): void {
  const entry = getEntry(provider, task)
  if (!entry.cooldownUntil || entry.probeScheduled) return
  entry.probeScheduled = true
  const delay = Math.max(0, entry.cooldownUntil - Date.now()) + 50
  setTimeout(() => {
    entry.probeScheduled = false
    void import('@/lib/ai/providers/health-probe.server')
      .then(({ runProviderHealthProbe }) => runProviderHealthProbe(provider, task))
      .catch(() => {
        /* probe module optional at runtime */
      })
  }, delay)
}

export function getCooldownRemainingMs(provider: ProviderId, task?: AITask): number {
  const entry = getEntry(provider, task)
  if (!entry.cooldownUntil) return 0
  return Math.max(0, entry.cooldownUntil - Date.now())
}

export function recordProviderSuccess(provider: ProviderId, task?: AITask): void {
  const entry = getEntry(provider, task)
  entry.lastSuccessAt = Date.now()
  entry.consecutiveFailures = 0
  entry.lastError = undefined
  entry.lastStatus = undefined
  entry.lastErrorCode = undefined
  entry.cooldownUntil = undefined
  entry.probeScheduled = false
}

export function recordProviderFailure(
  provider: ProviderId,
  error: string,
  task?: AITask,
  meta?: { status?: number | null; errorCode?: ProviderErrorKind }
): void {
  const entry = getEntry(provider, task)
  entry.lastFailureAt = Date.now()
  entry.lastError = error.slice(0, 240)
  entry.lastStatus = meta?.status ?? entry.lastStatus
  entry.lastErrorCode = meta?.errorCode ?? entry.lastErrorCode
  entry.consecutiveFailures += 1

  const cooldown = cooldownMsForFailures(entry.consecutiveFailures)
  if (cooldown > 0) {
    entry.cooldownUntil = Date.now() + cooldown
    scheduleProbeIfNeeded(provider, task)
  } else {
    entry.cooldownUntil = undefined
  }
}

export function isProviderHealthy(provider: ProviderId, task?: AITask): boolean {
  const entry = getEntry(provider, task)
  if (entry.consecutiveFailures < COOLDOWN_THRESHOLD) return true
  if (!entry.cooldownUntil) return true
  return Date.now() >= entry.cooldownUntil
}

export type ProviderHealthSnapshot = {
  provider: ProviderId
  task?: AITask
  lastSuccessAt?: number
  lastFailureAt?: number
  lastError?: string
  lastStatus?: number | null
  lastErrorCode?: ProviderErrorKind
  consecutiveFailures: number
  healthy: boolean
  cooldownRemainingMs: number
}

export function getProviderHealthSnapshot(): ProviderHealthSnapshot[] {
  const out: ProviderHealthSnapshot[] = []
  for (const [k, entry] of health.entries()) {
    const colon = k.indexOf(':')
    const provider = (colon >= 0 ? k.slice(0, colon) : k) as ProviderId
    const task = colon >= 0 ? (k.slice(colon + 1) as AITask) : undefined
    out.push({
      provider,
      task,
      lastSuccessAt: entry.lastSuccessAt,
      lastFailureAt: entry.lastFailureAt,
      lastError: entry.lastError,
      lastStatus: entry.lastStatus,
      lastErrorCode: entry.lastErrorCode,
      consecutiveFailures: entry.consecutiveFailures,
      healthy: isProviderHealthy(provider, task),
      cooldownRemainingMs: getCooldownRemainingMs(provider, task),
    })
  }
  return out
}

export function getProviderHealthPublicSnapshot(): Record<
  string,
  {
    healthy: boolean
    cooldown: number
    configured?: boolean
    lastError?: string | null
    lastStatus?: number | null
    errorCode?: ProviderErrorKind | null
  }
> {
  const config = getProviderConfigSnapshot()
  const byProvider = new Map(config.map((c) => [c.provider, c]))

  const out: Record<
    string,
    {
      healthy: boolean
      cooldown: number
      configured?: boolean
      lastError?: string | null
      lastStatus?: number | null
      errorCode?: ProviderErrorKind | null
    }
  > = {}

  for (const c of config) {
    out[c.provider] = {
      healthy: isProviderHealthy(c.provider),
      cooldown: Math.ceil(getCooldownRemainingMs(c.provider) / 1000),
      configured: c.configured,
    }
  }

  for (const snap of getProviderHealthSnapshot()) {
    if (snap.task) continue
    const base = out[snap.provider] ?? {
      healthy: snap.healthy,
      cooldown: Math.ceil(snap.cooldownRemainingMs / 1000),
    }
    out[snap.provider] = {
      ...base,
      healthy: snap.healthy,
      cooldown: Math.ceil(snap.cooldownRemainingMs / 1000),
      lastError: snap.lastError ?? null,
      lastStatus: snap.lastStatus ?? null,
      errorCode: snap.lastErrorCode ?? null,
    }
  }

  for (const [id, c] of byProvider) {
    if (!out[id]) {
      out[id] = {
        healthy: isProviderHealthy(id),
        cooldown: Math.ceil(getCooldownRemainingMs(id) / 1000),
        configured: c.configured,
      }
    }
  }

  return out
}

export function resetProviderHealth(): void {
  health.clear()
}
