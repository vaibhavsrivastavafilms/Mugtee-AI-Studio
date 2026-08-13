import 'server-only'

import {
  GEN_POLLINATIONS_BASE,
  inspectPollinationsKeyConfig,
  readPollinationsApiKeyFromEnv,
  type PollinationsKeyDiagnostic,
} from '@/lib/pollinations/key-diagnostics-core'

export type { PollinationsKeyDiagnostic } from '@/lib/pollinations/key-diagnostics-core'
export {
  inspectPollinationsKeyConfig,
  normalizePollinationsEnvKey,
  readPollinationsApiKeyFromEnv,
} from '@/lib/pollinations/key-diagnostics-core'

export type PollinationsAuthProbeResult = {
  provider: 'pollinations'
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
}

async function probeAccountEndpoint(path: string, key: string): Promise<{ ok: boolean; status: number }> {
  const url = new URL(`${GEN_POLLINATIONS_BASE}${path}`)
  url.searchParams.set('key', key)
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return { ok: true, status: res.status }
    if (res.status === 402) return { ok: true, status: res.status }
    return { ok: false, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

export async function probePollinationsAuthenticationStatus(): Promise<PollinationsAuthProbeResult> {
  const keyConfig = inspectPollinationsKeyConfig()
  const key = readPollinationsApiKeyFromEnv()

  if (!key) {
    return {
      provider: 'pollinations',
      configured: false,
      authenticated: false,
      ready: false,
      keyPresent: keyConfig.present,
      keyFormatValid: keyConfig.validFormat,
      keyLength: keyConfig.length,
      keyPrefix: keyConfig.prefix === 'none' ? 'none' : keyConfig.prefix,
      httpStatus: null,
      error: keyConfig.rejectedAsPlaceholder
        ? 'POLLINATIONS_API_KEY appears to be a placeholder value'
        : 'POLLINATIONS_API_KEY is missing',
      code: 'POLLINATIONS_API_KEY_REQUIRED',
    }
  }

  const bearerAttempts = [
    `${GEN_POLLINATIONS_BASE}/account/balance`,
    `${GEN_POLLINATIONS_BASE}/account/key`,
  ]

  for (const endpoint of bearerAttempts) {
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok || res.status === 402) {
        return {
          provider: 'pollinations',
          configured: true,
          authenticated: true,
          ready: true,
          keyPresent: true,
          keyFormatValid: keyConfig.validFormat,
          keyLength: key.length,
          keyPrefix: key.slice(0, 3),
          httpStatus: res.status,
          error: null,
          code: null,
        }
      }
    } catch {
      // try next probe
    }
  }

  for (const path of ['/account/balance', '/account/key']) {
    const queryProbe = await probeAccountEndpoint(path, key)
    if (queryProbe.ok) {
      return {
        provider: 'pollinations',
        configured: true,
        authenticated: true,
        ready: true,
        keyPresent: true,
        keyFormatValid: keyConfig.validFormat,
        keyLength: key.length,
        keyPrefix: key.slice(0, 3),
        httpStatus: queryProbe.status,
        error: null,
        code: null,
      }
    }
  }

  return {
    provider: 'pollinations',
    configured: true,
    authenticated: false,
    ready: false,
    keyPresent: true,
    keyFormatValid: keyConfig.validFormat,
    keyLength: key.length,
    keyPrefix: key.slice(0, 3),
    httpStatus: 401,
    error:
      'POLLINATIONS_AUTH_FAILED — Pollinations rejected the configured API key. Create or rotate a secret sk_ key at https://enter.pollinations.ai/keys, update POLLINATIONS_API_KEY in .env.local, then restart the Next.js dev server.',
    code: 'POLLINATIONS_AUTH_FAILED',
  }
}
