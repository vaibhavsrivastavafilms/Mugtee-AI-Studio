import 'server-only'

import { getOpenRouterTextProviderHealth } from '@/lib/ai/providers/openrouter/health'
import { OPENROUTER_MODELS_URL } from '@/lib/ai/providers/openrouter/router'
import {
  inspectOpenRouterKeyConfig,
  readOpenRouterApiKeyFromEnv,
} from '@/lib/ai/providers/openrouter/key-diagnostics-core'

export type OpenRouterAuthProbeResult = {
  provider: 'openrouter'
  configured: boolean
  authenticated: boolean
  ready: boolean
  keyPresent: boolean
  keyFormatValid: boolean
  keyLength: number
  keyPrefix: string
  httpStatus: number | null
  error: string | null
  code: string | null
  workingModel: string | null
  cachedModels: number
}

export async function probeOpenRouterAuthenticationStatus(): Promise<OpenRouterAuthProbeResult> {
  const keyConfig = inspectOpenRouterKeyConfig()
  const key = readOpenRouterApiKeyFromEnv()

  if (!key) {
    return {
      provider: 'openrouter',
      configured: false,
      authenticated: false,
      ready: false,
      keyPresent: keyConfig.present,
      keyFormatValid: keyConfig.validFormat,
      keyLength: keyConfig.length,
      keyPrefix: keyConfig.prefix === 'none' ? 'none' : keyConfig.prefix,
      httpStatus: null,
      error: keyConfig.rejectedAsPlaceholder
        ? 'OPENROUTER_API_KEY appears to be a placeholder value'
        : 'OPENROUTER_API_KEY is missing',
      code: 'OPENROUTER_AUTH_FAILED',
      workingModel: null,
      cachedModels: 0,
    }
  }

  try {
    const res = await fetch(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (res.status === 401 || res.status === 403) {
      return {
        provider: 'openrouter',
        configured: true,
        authenticated: false,
        ready: false,
        keyPresent: true,
        keyFormatValid: keyConfig.validFormat,
        keyLength: key.length,
        keyPrefix: 'sk-or-',
        httpStatus: res.status,
        error: 'OpenRouter rejected the configured API key',
        code: 'OPENROUTER_AUTH_FAILED',
        workingModel: null,
        cachedModels: 0,
      }
    }

    if (!res.ok) {
      return {
        provider: 'openrouter',
        configured: true,
        authenticated: true,
        ready: false,
        keyPresent: true,
        keyFormatValid: keyConfig.validFormat,
        keyLength: key.length,
        keyPrefix: 'sk-or-',
        httpStatus: res.status,
        error: `OpenRouter models catalog unavailable (HTTP ${res.status})`,
        code: 'OPENROUTER_API_UNAVAILABLE',
        workingModel: null,
        cachedModels: 0,
      }
    }

    const health = await getOpenRouterTextProviderHealth()
    return {
      provider: 'openrouter',
      configured: true,
      authenticated: true,
      ready: health.ready,
      keyPresent: true,
      keyFormatValid: keyConfig.validFormat,
      keyLength: key.length,
      keyPrefix: 'sk-or-',
      httpStatus: res.status,
      error: health.ready ? null : 'OpenRouter catalog has no eligible free models',
      code: health.ready ? null : 'OPENROUTER_NO_AVAILABLE_FREE_MODEL',
      workingModel: health.workingModel || null,
      cachedModels: health.cachedModels,
    }
  } catch {
    return {
      provider: 'openrouter',
      configured: true,
      authenticated: false,
      ready: false,
      keyPresent: true,
      keyFormatValid: keyConfig.validFormat,
      keyLength: key.length,
      keyPrefix: 'sk-or-',
      httpStatus: null,
      error: 'OpenRouter authentication probe failed',
      code: 'OPENROUTER_API_UNAVAILABLE',
      workingModel: null,
      cachedModels: 0,
    }
  }
}
