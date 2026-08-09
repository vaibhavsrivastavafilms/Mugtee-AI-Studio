import 'server-only'

import type {
  V7VideoGenerationInput,
  V7VideoProvider,
  V7VideoProviderCapabilityReport,
} from '@/lib/v7/providers/video-provider.types'

const CAPABILITY_CACHE_TTL_MS = 5 * 60_000

type CapabilityCacheEntry = {
  expiresAt: number
  report: V7VideoProviderCapabilityReport
}

const capabilityCache = new Map<string, CapabilityCacheEntry>()

function capabilityCacheKey(providerId: string, userId?: string): string {
  return `${providerId}:${userId ?? 'global'}`
}

export async function evaluateV7VideoProviderCapability(
  provider: V7VideoProvider,
  input: V7VideoGenerationInput,
  priority: number
): Promise<V7VideoProviderCapabilityReport> {
  const cacheKey = capabilityCacheKey(provider.id, input.userId)
  const cached = capabilityCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.report, priority }
  }

  const report = await evaluateV7VideoProviderCapabilityUncached(provider, input, priority)
  capabilityCache.set(cacheKey, {
    expiresAt: Date.now() + CAPABILITY_CACHE_TTL_MS,
    report,
  })
  return report
}

async function evaluateV7VideoProviderCapabilityUncached(
  provider: V7VideoProvider,
  input: V7VideoGenerationInput,
  priority: number
): Promise<V7VideoProviderCapabilityReport> {
  const base = {
    provider: provider.id,
    available: false,
    priority,
  } satisfies Partial<V7VideoProviderCapabilityReport>

  if (!provider.supports(input)) {
    return {
      ...base,
      reason: 'NOT_CONFIGURED',
      message: `${provider.displayName} is not configured for scene video generation`,
    }
  }

  const validation = provider.validateInput(input)
  if (!validation.ok) {
    return {
      ...base,
      reason: 'INPUT_REJECTED',
      message: validation.reason,
    }
  }

  const account = await provider.accountCapabilities({ userId: input.userId })
  if (!account.authenticated) {
    return {
      ...base,
      reason: account.reason ?? 'NOT_AUTHENTICATED',
      message: account.message ?? `${provider.displayName} is not authenticated`,
    }
  }

  if (!account.entitled) {
    return {
      ...base,
      reason: account.reason ?? 'NOT_ENTITLED',
      message: account.message ?? `${provider.displayName} account is not entitled`,
      entitledModels: account.entitledModels,
    }
  }

  const videoModels = await provider.availableVideoModels()
  const models = await provider.availableModels()
  const entitledModels = account.entitledModels ?? videoModels.models.map((entry) => entry.id)
  if (videoModels.models.length === 0 || entitledModels.length === 0) {
    return {
      ...base,
      reason: 'MODEL_NOT_AVAILABLE',
      message:
        videoModels.models.length === 0
          ? `${provider.displayName} has no available scene video models`
          : `${provider.displayName} has no entitled scene video models`,
      models: models.models,
      entitledModels,
    }
  }

  const health = await provider.health()
  if (!health.healthy) {
    return {
      ...base,
      reason: 'UNHEALTHY',
      message: health.message ?? `${provider.displayName} health check failed`,
      models: models.models,
      entitledModels,
      latencyMs: health.latencyMs,
    }
  }

  return {
    provider: provider.id,
    available: true,
    priority,
    models: models.models,
    entitledModels,
    latencyMs: health.latencyMs,
  }
}

export async function resolveSceneVideoProviderCapabilities(
  providers: V7VideoProvider[],
  input: V7VideoGenerationInput
): Promise<V7VideoProviderCapabilityReport[]> {
  return Promise.all(
    providers.map((provider, index) =>
      evaluateV7VideoProviderCapability(provider, input, index + 1)
    )
  )
}

export function invalidateVideoProviderCapabilityCache(
  providerId: string,
  userId?: string
): void {
  capabilityCache.delete(capabilityCacheKey(providerId, userId))
}

export function selectEligibleSceneVideoProviders(
  providers: V7VideoProvider[],
  evaluations: V7VideoProviderCapabilityReport[]
): V7VideoProvider[] {
  const availableIds = new Set(
    evaluations.filter((entry) => entry.available).map((entry) => entry.provider)
  )

  return providers
    .filter((provider) => availableIds.has(provider.id))
    .sort((left, right) => {
      const leftEval = evaluations.find((entry) => entry.provider === left.id)
      const rightEval = evaluations.find((entry) => entry.provider === right.id)
      return (leftEval?.priority ?? Number.MAX_SAFE_INTEGER) - (rightEval?.priority ?? Number.MAX_SAFE_INTEGER)
    })
}
