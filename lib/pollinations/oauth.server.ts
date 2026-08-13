import 'server-only'

import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  disconnectIntegration,
  upsertIntegrationConnection,
} from '@/lib/integrations/integration-auth'
import {
  POLLINATIONS_AUTHORIZE_URL,
  POLLINATIONS_INTEGRATION_PROVIDER,
  POLLINATIONS_OAUTH_DEFAULT_EXPIRY_DAYS,
  POLLINATIONS_OAUTH_SCOPES,
  POLLINATIONS_TOKEN_URL,
  POLLINATIONS_USERINFO_URL,
} from '@/lib/pollinations/constants.server'
import { readPollinationsApiKeyFromEnv } from '@/lib/pollinations/key-diagnostics-core'
import { buildApplicationRedirectUrl, resolveApplicationOrigin } from '@/lib/url'

export type PollinationsOAuthConfiguration = {
  clientId: string
  redirectUri: string
  appKeyConfigured: boolean
  earningsReady: boolean
}

export type PollinationsConnectionStatus = {
  connected: boolean
  authenticated: boolean
  source: 'oauth' | 'api_key' | null
  pollenBalance: number | null
  expiresAt: string | null
  username: string | null
  error: string | null
}

function readPollinationsAppKey(): string | null {
  const candidates = [
    process.env.POLLINATIONS_APP_KEY,
    process.env.POLLINATIONS_CLIENT_ID,
  ]
  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed?.startsWith('pk_')) return trimmed
  }
  return null
}

export function resolvePollinationsOAuthConfiguration(): PollinationsOAuthConfiguration {
  const clientId = readPollinationsAppKey()
  if (!clientId) {
    throw new Error(
      'POLLINATIONS_APP_KEY (pk_…) is required for BYOP OAuth. Create an App Key at https://enter.pollinations.ai/keys'
    )
  }

  const redirectOverride = process.env.POLLINATIONS_REDIRECT_URI?.trim()
  const redirectUri =
    redirectOverride ||
    buildApplicationRedirectUrl('/api/auth/pollinations/callback').replace(/\?.*$/, '')

  const earningsFlag = process.env.POLLINATIONS_EARNINGS_ENABLED?.trim().toLowerCase()
  const earningsReady = earningsFlag === 'true' || earningsFlag === '1'

  return {
    clientId,
    redirectUri,
    appKeyConfigured: true,
    earningsReady,
  }
}

export function createPollinationsPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildPollinationsAuthorizationUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}): string {
  const url = new URL(POLLINATIONS_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', POLLINATIONS_OAUTH_SCOPES)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('expiry', String(POLLINATIONS_OAUTH_DEFAULT_EXPIRY_DAYS))
  return url.toString()
}

type TokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

export async function exchangePollinationsAuthorizationCode(params: {
  code: string
  clientId: string
  redirectUri: string
  codeVerifier: string
}): Promise<{ accessToken: string; expiresAt: string | null; scope: string | null }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  })

  const res = await fetch(POLLINATIONS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(30_000),
  })

  const raw = await res.text()
  let data: TokenResponse = {}
  try {
    data = JSON.parse(raw) as TokenResponse
  } catch {
    data = {}
  }

  if (!res.ok || !data.access_token?.trim()) {
    const message = data.error_description ?? data.error ?? `Token exchange failed (${res.status})`
    throw new Error(message)
  }

  const expiresAt =
    typeof data.expires_in === 'number' && data.expires_in > 0
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null

  return {
    accessToken: data.access_token.trim(),
    expiresAt,
    scope: data.scope?.trim() ?? null,
  }
}

async function fetchPollinationsUserProfile(accessToken: string): Promise<{ username: string | null }> {
  try {
    const res = await fetch(POLLINATIONS_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { username: null }
    const body = (await res.json()) as { preferred_username?: string; name?: string }
    return { username: body.preferred_username?.trim() || body.name?.trim() || null }
  } catch {
    return { username: null }
  }
}

export async function storePollinationsOAuthConnection(params: {
  supabase: SupabaseClient
  userId: string
  accessToken: string
  expiresAt: string | null
  scope: string | null
}): Promise<void> {
  const profile = await fetchPollinationsUserProfile(params.accessToken)

  await upsertIntegrationConnection(params.supabase, params.userId, POLLINATIONS_INTEGRATION_PROVIDER, {
    status: 'connected',
    tokens: {
      access_token: params.accessToken,
      token_type: 'bearer',
      expires_at: params.expiresAt,
      scope: params.scope,
      connectedAt: new Date().toISOString(),
      source: 'oauth_byop',
    },
    metadata: {
      username: profile.username,
      oauth: true,
      appOrigin: resolveApplicationOrigin(),
    },
  })
}

function readTokenField(tokens: Record<string, unknown> | null, key: string): string | undefined {
  const value = tokens?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function getPollinationsConnectionStatus(params: {
  supabase: SupabaseClient
  userId: string
}): Promise<PollinationsConnectionStatus> {
  const { data } = await params.supabase
    .from('user_integrations')
    .select('status, tokens_encrypted, metadata')
    .eq('user_id', params.userId)
    .eq('provider', POLLINATIONS_INTEGRATION_PROVIDER)
    .maybeSingle()

  if (!data || data.status !== 'connected') {
    return {
      connected: false,
      authenticated: false,
      source: null,
      pollenBalance: null,
      expiresAt: null,
      username: null,
      error: null,
    }
  }

  const tokens = (data.tokens_encrypted ?? {}) as Record<string, unknown>
  const metadata = (data.metadata ?? {}) as Record<string, unknown>
  const accessToken =
    readTokenField(tokens, 'access_token') ?? readTokenField(tokens, 'api_key')

  if (!accessToken?.startsWith('sk_')) {
    return {
      connected: false,
      authenticated: false,
      source: null,
      pollenBalance: null,
      expiresAt: null,
      username: null,
      error: null,
    }
  }

  const expiresAt = readTokenField(tokens, 'expires_at') ?? null
  const source = readTokenField(tokens, 'source') === 'oauth_byop' ? 'oauth' : 'api_key'
  const username =
    typeof metadata.username === 'string' && metadata.username.trim()
      ? metadata.username.trim()
      : null

  let pollenBalance: number | null = null
  let authenticated = true
  let error: string | null = null

  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    authenticated = false
    error = 'AUTH_EXPIRED'
  } else {
    try {
      const res = await fetch('https://gen.pollinations.ai/account/balance', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const body = (await res.json()) as Record<string, unknown>
        const balance = Number(body.balance ?? body.pollen ?? NaN)
        pollenBalance = Number.isFinite(balance) ? balance : null
      } else if (res.status === 401 || res.status === 403) {
        authenticated = false
        error = 'AUTH_EXPIRED'
      }
    } catch {
      // balance optional
    }
  }

  return {
    connected: true,
    authenticated,
    source,
    pollenBalance,
    expiresAt,
    username,
    error,
  }
}

export async function disconnectPollinationsConnection(params: {
  supabase: SupabaseClient
  userId: string
}): Promise<boolean> {
  return disconnectIntegration(params.supabase, params.userId, POLLINATIONS_INTEGRATION_PROVIDER)
}

/** Whether Mugtee deployment has platform Pollinations fallback configured. */
export function hasPlatformPollinationsFallback(): boolean {
  const key = readPollinationsApiKeyFromEnv()
  return Boolean(key?.startsWith('sk_'))
}
