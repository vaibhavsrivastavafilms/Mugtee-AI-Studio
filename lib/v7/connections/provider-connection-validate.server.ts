import 'server-only'

import { isValidRunwayApiKeyFormat } from '@/lib/ai/runway-video'
import type { ManagedVideoProviderId } from '@/lib/v7/connections/provider-connection.types'

export type ProviderValidationResult = {
  valid: boolean
  authenticated: boolean
  healthy: boolean
  reason?: string
  message?: string
  latencyMs?: number
  models?: string[]
}

async function probeWanApiKey(apiKey: string): Promise<ProviderValidationResult> {
  const started = Date.now()
  const base = process.env.WAN_VIDEO_BASE_URL?.trim()?.replace(/\/$/, '') ||
    'https://dashscope-intl.aliyuncs.com/api/v1'

  const res = await fetch(`${base}/models?page_no=1&page_size=5`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30_000),
  })

  const latencyMs = Date.now() - started
  const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string }

  if (res.status === 401) {
    return {
      valid: false,
      authenticated: false,
      healthy: false,
      reason: 'INVALID_API_KEY',
      message: 'DashScope rejected the API key.',
      latencyMs,
    }
  }

  if (!res.ok) {
    return {
      valid: false,
      authenticated: true,
      healthy: false,
      reason: 'UNAVAILABLE',
      message: body.message ?? `DashScope probe failed (${res.status})`,
      latencyMs,
    }
  }

  const catalog = new Set<string>()
  const pageModels = (body as { output?: { models?: Array<{ model?: string }> } }).output?.models ?? []
  for (const entry of pageModels) {
    if (entry.model?.trim()) catalog.add(entry.model.trim())
  }

  return {
    valid: true,
    authenticated: true,
    healthy: true,
    latencyMs,
    models: [...catalog],
  }
}

function validateRunwayApiKey(apiKey: string): ProviderValidationResult {
  if (!isValidRunwayApiKeyFormat(apiKey)) {
    return {
      valid: false,
      authenticated: false,
      healthy: false,
      reason: 'INVALID_API_KEY',
      message: 'Runway keys must match key_ + 128 hex characters.',
    }
  }
  return {
    valid: true,
    authenticated: true,
    healthy: true,
    message: 'Runway API key format is valid.',
  }
}

function validateSeedanceApiKey(apiKey: string): ProviderValidationResult {
  if (!apiKey.trim()) {
    return {
      valid: false,
      authenticated: false,
      healthy: false,
      reason: 'INVALID_API_KEY',
      message: 'Seedance API key is empty.',
    }
  }
  return {
    valid: true,
    authenticated: true,
    healthy: true,
    message: 'Seedance API key saved.',
  }
}

export async function validateProviderApiKey(
  providerId: ManagedVideoProviderId,
  apiKey: string
): Promise<ProviderValidationResult> {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    return {
      valid: false,
      authenticated: false,
      healthy: false,
      reason: 'INVALID_API_KEY',
      message: 'API key is required.',
    }
  }

  switch (providerId) {
    case 'wan':
      return probeWanApiKey(trimmed)
    case 'runway':
      return validateRunwayApiKey(trimmed)
    case 'seedance':
      return validateSeedanceApiKey(trimmed)
    case 'openart':
      return {
        valid: false,
        authenticated: false,
        healthy: false,
        reason: 'NOT_AUTHENTICATED',
        message: 'OpenArt uses OAuth only. Connect via /api/openart/auth.',
      }
    default:
      return {
        valid: Boolean(trimmed),
        authenticated: Boolean(trimmed),
        healthy: Boolean(trimmed),
        message: 'Endpoint credentials must be configured via environment variables.',
        reason: trimmed ? undefined : 'NOT_CONFIGURED',
      }
  }
}
