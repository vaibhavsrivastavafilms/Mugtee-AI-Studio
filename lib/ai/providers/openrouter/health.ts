import 'server-only'

import { hasOpenRouterApiKey } from '@/lib/ai/providers/openrouter/client'
import {
  getOpenRouterRouterHealthSnapshot,
  openRouterModelRouter,
} from '@/lib/ai/providers/openrouter/router'

export type OpenRouterTextProviderHealth = {
  provider: 'openrouter'
  connected: boolean
  ready: boolean
  workingModel: string
  cachedModels: number
  blacklistedModels: number
  lastRefresh: string
}

export async function getOpenRouterTextProviderHealth(): Promise<OpenRouterTextProviderHealth> {
  if (!hasOpenRouterApiKey()) {
    return {
      provider: 'openrouter',
      connected: false,
      ready: false,
      workingModel: '',
      cachedModels: 0,
      blacklistedModels: 0,
      lastRefresh: '',
    }
  }

  try {
    await openRouterModelRouter.ensureCatalog()
    const snapshot = getOpenRouterRouterHealthSnapshot()

    return {
      provider: 'openrouter',
      connected: true,
      ready: Boolean(snapshot?.cachedModels),
      workingModel: snapshot?.workingModel ?? '',
      cachedModels: snapshot?.cachedModels ?? 0,
      blacklistedModels: snapshot?.blacklistedModels ?? 0,
      lastRefresh: snapshot?.lastRefresh ?? '',
    }
  } catch {
    const snapshot = getOpenRouterRouterHealthSnapshot()
    return {
      provider: 'openrouter',
      connected: true,
      ready: false,
      workingModel: snapshot?.workingModel ?? '',
      cachedModels: snapshot?.cachedModels ?? 0,
      blacklistedModels: snapshot?.blacklistedModels ?? 0,
      lastRefresh: snapshot?.lastRefresh ?? '',
    }
  }
}
