import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  OPENART_MCP_PROVIDER,
  OPENART_OAUTH_ENDPOINTS,
  OPENART_OAUTH_SCOPE,
} from '@/lib/openart/constants.server'
import { invalidateOpenArtMcpCatalogCache } from '@/lib/openart/mcp-catalog.server'
import {
  getOpenArtOAuthAuditSnapshot,
  recordOpenArtOAuthAudit,
  recordOpenArtOAuthFailure,
} from '@/lib/openart/oauth-audit.server'
import { OpenArtOAuthError } from '@/lib/openart/oauth-errors.server'
import {
  loadPersistedOpenArtOAuthClient,
  persistOpenArtOAuthClient,
} from '@/lib/openart/oauth-client-store.server'
import { invalidateVideoProviderCapabilityCache } from '@/lib/v7/providers/video-capability.server'
import { resolveApplicationOrigin } from '@/lib/url'

export type OpenArtOAuthTokens = {
  access_token: string
  refresh_token?: string
  expires_at: string
  token_type: string
  client_id: string
}

export type OpenArtConnectionDiagnosis = {
  connected: boolean
  authenticated: boolean
  ready: boolean
  reason: string | null
  error: string | null
  hasRow: boolean
  status: string | null
  hasAccessToken: boolean
  hasRefreshToken: boolean
  expiresAt: string | null
  provider: string
}

let cachedOAuthClientId: string | null = null
let clientRegistrationPromise: Promise<string> | null = null

export type OpenArtOAuthConfiguration = {
  clientId: string
  redirectUri: string
  clientSecret?: string
  source: 'env' | 'persisted' | 'registered'
}

function readOpenArtClientIdFromEnv(): string | null {
  const candidates = [
    process.env.OPENART_MCP_CLIENT_ID,
    process.env.OPENART_CLIENT_ID,
  ]
  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

async function registerOpenArtOAuthClientWithOpenArt(redirectUri: string): Promise<string> {
  console.info('[openart-oauth] registering dynamic OAuth client', { redirectUri })

  const res = await fetch(OPENART_OAUTH_ENDPOINTS.register, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'Mugtee AI Studio',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const rawBody = await res.text()
  let data: {
    client_id?: string
    client_secret?: string
    error?: string
    error_description?: string
  } = {}
  try {
    data = JSON.parse(rawBody) as typeof data
  } catch {
    data = {}
  }

  console.info('[openart-oauth] client registration response', {
    status: res.status,
    ok: res.ok,
    body: rawBody,
  })

  if (!res.ok || !data.client_id?.trim()) {
    throw new OpenArtOAuthError(
      'OPENART_CLIENT_REGISTRATION_FAILED',
      data.error_description ?? data.error ?? `OpenArt OAuth registration failed (${res.status})`,
      { details: { status: res.status, body: rawBody, redirectUri } }
    )
  }

  const clientId = data.client_id.trim()
  cachedOAuthClientId = clientId

  await persistOpenArtOAuthClient({
    client_id: clientId,
    redirect_uri: redirectUri,
    client_secret: data.client_secret?.trim() || undefined,
    registered_at: new Date().toISOString(),
  })

  console.info('[openart-oauth] dynamic client registered', {
    clientIdPrefix: clientId.slice(0, 8),
    redirectUri,
    persisted: true,
  })

  return clientId
}

export async function resolveOpenArtOAuthConfiguration(): Promise<OpenArtOAuthConfiguration> {
  const redirectUri = resolveOpenArtOAuthRedirectUri()

  const fromEnv = readOpenArtClientIdFromEnv()
  if (fromEnv) {
    cachedOAuthClientId = fromEnv
    return { clientId: fromEnv, redirectUri, source: 'env' }
  }

  if (cachedOAuthClientId) {
    return { clientId: cachedOAuthClientId, redirectUri, source: 'persisted' }
  }

  const persisted = await loadPersistedOpenArtOAuthClient()
  if (persisted?.client_id) {
    if (persisted.redirect_uri === redirectUri) {
      cachedOAuthClientId = persisted.client_id
      return {
        clientId: persisted.client_id,
        redirectUri,
        clientSecret: persisted.client_secret,
        source: 'persisted',
      }
    }

    console.warn('[openart-oauth] persisted client redirect_uri mismatch — re-registering', {
      persistedRedirectUri: persisted.redirect_uri,
      redirectUri,
      clientIdPrefix: persisted.client_id.slice(0, 8),
    })
  }

  if (!clientRegistrationPromise) {
    clientRegistrationPromise = registerOpenArtOAuthClientWithOpenArt(redirectUri).finally(() => {
      clientRegistrationPromise = null
    })
  }

  const clientId = await clientRegistrationPromise
  return { clientId, redirectUri, source: 'registered' }
}

export async function resolveOpenArtClientId(): Promise<string> {
  const config = await resolveOpenArtOAuthConfiguration()
  return config.clientId
}

export async function registerOpenArtOAuthClient(): Promise<string> {
  return resolveOpenArtClientId()
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input
  return buffer.toString('base64url')
}

export function createOpenArtPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32))
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function resolveOpenArtOAuthRedirectUri(): string {
  const explicit = process.env.OPENART_REDIRECT_URI?.trim()
  if (explicit) {
    try {
      return new URL(explicit).toString()
    } catch {
      // fall through to canonical origin
    }
  }
  return `${resolveApplicationOrigin()}/api/openart/callback`
}

export async function buildOpenArtAuthorizationUrl(params: {
  state: string
  codeChallenge: string
  clientId: string
}): Promise<string> {
  const redirectUri = resolveOpenArtOAuthRedirectUri()
  const url = new URL(OPENART_OAUTH_ENDPOINTS.authorize)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', OPENART_OAUTH_SCOPE)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  console.info('[openart-oauth] authorization url built', {
    redirectUri,
    clientIdPrefix: params.clientId.slice(0, 8),
    authorizationUrl: url.toString(),
  })

  return url.toString()
}

export async function exchangeOpenArtAuthorizationCode(params: {
  code: string
  codeVerifier: string
  clientId: string
}): Promise<OpenArtOAuthTokens> {
  const redirectUri = resolveOpenArtOAuthRedirectUri()
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  })

  console.info('[openart-oauth] token exchange request', {
    redirectUri,
    clientIdPrefix: params.clientId.slice(0, 8),
    codeLength: params.code.length,
    verifierLength: params.codeVerifier.length,
  })

  const res = await fetch(OPENART_OAUTH_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(30_000),
  })

  const rawBody = await res.text()
  let data: {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    error?: string
    error_description?: string
  } = {}

  try {
    data = JSON.parse(rawBody) as typeof data
  } catch {
    data = {}
  }

  console.info('[openart-oauth] token exchange response', {
    status: res.status,
    ok: res.ok,
    body: rawBody,
    hasAccessToken: Boolean(data.access_token?.trim()),
    hasRefreshToken: Boolean(data.refresh_token?.trim()),
    expiresIn: data.expires_in ?? null,
  })

  if (!res.ok || !data.access_token?.trim()) {
    throw new OpenArtOAuthError(
      'OPENART_TOKEN_EXCHANGE_FAILED',
      data.error_description ?? data.error ?? `OpenArt token exchange failed (${res.status})`,
      {
        details: {
          status: res.status,
          body: rawBody,
          redirectUri,
          clientIdPrefix: params.clientId.slice(0, 8),
        },
      }
    )
  }

  const expiresInSec = Number.isFinite(data.expires_in) ? Number(data.expires_in) : 3600
  return {
    access_token: data.access_token.trim(),
    refresh_token: data.refresh_token?.trim(),
    token_type: data.token_type?.trim() || 'Bearer',
    client_id: params.clientId,
    expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  }
}

export async function refreshOpenArtAccessToken(params: {
  refreshToken: string
  clientId: string
}): Promise<OpenArtOAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  })

  const res = await fetch(OPENART_OAUTH_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(30_000),
  })

  const rawBody = await res.text()
  let data: {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    error?: string
    error_description?: string
  } = {}

  try {
    data = JSON.parse(rawBody) as typeof data
  } catch {
    data = {}
  }

  if (!res.ok || !data.access_token?.trim()) {
    throw new OpenArtOAuthError(
      'OPENART_TOKEN_EXCHANGE_FAILED',
      data.error_description ?? data.error ?? `OpenArt token refresh failed (${res.status})`,
      { details: { status: res.status, body: rawBody } }
    )
  }

  const expiresInSec = Number.isFinite(data.expires_in) ? Number(data.expires_in) : 3600
  return {
    access_token: data.access_token.trim(),
    refresh_token: data.refresh_token?.trim() ?? params.refreshToken,
    token_type: data.token_type?.trim() || 'Bearer',
    client_id: params.clientId,
    expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  }
}

function parseStoredTokens(raw: Record<string, unknown> | null | undefined): OpenArtOAuthTokens | null {
  if (!raw) return null
  const access = typeof raw.access_token === 'string' ? raw.access_token.trim() : ''
  if (!access) return null
  const clientId =
    typeof raw.client_id === 'string'
      ? raw.client_id.trim()
      : readOpenArtClientIdFromEnv() || cachedOAuthClientId || ''
  return {
    access_token: access,
    refresh_token: typeof raw.refresh_token === 'string' ? raw.refresh_token.trim() : undefined,
    expires_at:
      typeof raw.expires_at === 'string' ? raw.expires_at : new Date(Date.now() + 3600_000).toISOString(),
    token_type: typeof raw.token_type === 'string' ? raw.token_type : 'Bearer',
    client_id: clientId,
  }
}

export function hasOpenArtEnvAccessToken(): boolean {
  return Boolean(process.env.OPENART_MCP_ACCESS_TOKEN?.trim())
}

export async function persistOpenArtTokensForUser(
  userId: string,
  tokens: OpenArtOAuthTokens
): Promise<void> {
  const client = createSupabaseServiceClient()
  if (!client) {
    throw new OpenArtOAuthError(
      'OPENART_TOKEN_PERSIST_FAILED',
      'Supabase service client unavailable — set SUPABASE_SERVICE_ROLE_KEY',
      { details: { userId } }
    )
  }

  const payload = {
    user_id: userId,
    provider: OPENART_MCP_PROVIDER,
    status: 'connected' as const,
    tokens_encrypted: tokens,
    metadata: {
      connectedAt: new Date().toISOString(),
      source: 'oauth',
      clientIdPrefix: tokens.client_id.slice(0, 8),
    },
    updated_at: new Date().toISOString(),
    last_health_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('user_integrations')
    .upsert(payload, { onConflict: 'user_id,provider' })
    .select('id, status, tokens_encrypted, updated_at')
    .maybeSingle()

  console.info('[openart-oauth] database write', {
    userId,
    provider: OPENART_MCP_PROVIDER,
    ok: !error,
    rowId: data?.id ?? null,
    status: data?.status ?? null,
    supabaseError: error?.message ?? null,
    supabaseCode: error?.code ?? null,
    supabaseDetails: error?.details ?? null,
  })

  if (error) {
    throw new OpenArtOAuthError('OPENART_TOKEN_PERSIST_FAILED', error.message, {
      details: {
        userId,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
    })
  }

  if (!data) {
    throw new OpenArtOAuthError('OPENART_TOKEN_PERSIST_FAILED', 'Upsert returned no row', {
      details: { userId },
    })
  }
}

export async function invalidateOpenArtOAuthCaches(userId: string): Promise<void> {
  invalidateOpenArtMcpCatalogCache(userId)
  invalidateVideoProviderCapabilityCache('openart-mcp', userId)
  const { invalidateOpenArtAuthCache } = await import('@/lib/openart/authenticate.server')
  invalidateOpenArtAuthCache(userId)
  console.info('[openart-oauth] cache invalidated', { userId })
}

export async function getOpenArtAccessTokenForUser(userId: string): Promise<string | null> {
  const client = createSupabaseServiceClient()
  if (client && userId?.trim()) {
    const { data, error } = await client
      .from('user_integrations')
      .select('tokens_encrypted, status')
      .eq('user_id', userId)
      .eq('provider', OPENART_MCP_PROVIDER)
      .maybeSingle()

    if (error) {
      console.error('[openart-oauth] token read failed', {
        userId,
        message: error.message,
        code: error.code,
      })
      return null
    }

    if (data && data.status === 'connected') {
      let tokens = parseStoredTokens(data.tokens_encrypted as Record<string, unknown>)
      if (tokens) {
        const expiresAt = Date.parse(tokens.expires_at)
        const needsRefresh = !Number.isFinite(expiresAt) || expiresAt - Date.now() < 60_000

        if (!needsRefresh) return tokens.access_token
        if (tokens.refresh_token && tokens.client_id) {
          try {
            const refreshed = await refreshOpenArtAccessToken({
              refreshToken: tokens.refresh_token,
              clientId: tokens.client_id,
            })
            await persistOpenArtTokensForUser(userId, refreshed)
            return refreshed.access_token
          } catch (err) {
            console.error('[openart-oauth] token refresh failed', {
              userId,
              message: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            })
            return tokens.access_token
          }
        }
        return tokens.access_token
      }
    }
  }

  const envToken = process.env.OPENART_MCP_ACCESS_TOKEN?.trim()
  if (envToken) return envToken

  return null
}

export async function diagnoseOpenArtConnection(userId: string): Promise<OpenArtConnectionDiagnosis> {
  const base: OpenArtConnectionDiagnosis = {
    connected: false,
    authenticated: false,
    ready: false,
    reason: null,
    error: 'OPENART_NOT_AUTHENTICATED',
    hasRow: false,
    status: null,
    hasAccessToken: false,
    hasRefreshToken: false,
    expiresAt: null,
    provider: OPENART_MCP_PROVIDER,
  }

  if (!userId?.trim()) {
    return { ...base, reason: 'No signed-in user' }
  }

  const client = createSupabaseServiceClient()
  if (!client) {
    return {
      ...base,
      error: 'OPENART_STATUS_READ_FAILED',
      reason: 'Supabase service client unavailable',
    }
  }

  const { data, error } = await client
    .from('user_integrations')
    .select('status, tokens_encrypted, updated_at')
    .eq('user_id', userId)
    .eq('provider', OPENART_MCP_PROVIDER)
    .maybeSingle()

  if (error) {
    return {
      ...base,
      error: 'OPENART_STATUS_READ_FAILED',
      reason: error.message,
    }
  }

  if (!data) {
    return {
      ...base,
      reason: 'No OpenArt integration row — complete OAuth at /api/openart/auth',
    }
  }

  const tokens = parseStoredTokens(data.tokens_encrypted as Record<string, unknown>)
  const hasAccessToken = Boolean(tokens?.access_token)
  const hasRefreshToken = Boolean(tokens?.refresh_token)

  if (data.status !== 'connected') {
    return {
      ...base,
      hasRow: true,
      status: data.status,
      hasAccessToken,
      hasRefreshToken,
      expiresAt: tokens?.expires_at ?? null,
      reason: `Integration status is "${data.status}" — reconnect at /api/openart/auth`,
    }
  }

  if (!hasAccessToken) {
    return {
      ...base,
      hasRow: true,
      status: data.status,
      hasRefreshToken,
      reason: 'Integration row exists but access_token is missing',
    }
  }

  return {
    connected: true,
    authenticated: true,
    ready: true,
    reason: null,
    error: null,
    hasRow: true,
    status: data.status,
    hasAccessToken,
    hasRefreshToken,
    expiresAt: tokens?.expires_at ?? null,
    provider: OPENART_MCP_PROVIDER,
  }
}

export async function isOpenArtMcpConnected(userId?: string): Promise<boolean> {
  if (!userId?.trim()) return false
  const diagnosis = await diagnoseOpenArtConnection(userId)
  return diagnosis.connected
}

export function markOpenArtOAuthProviderReady(): void {
  recordOpenArtOAuthAudit({
    providerReady: true,
    cacheInvalidated: true,
    tokenPersisted: true,
    tokenExchanged: true,
  })
  console.info('[openart-oauth] status ready', getOpenArtOAuthAuditSnapshot())
}
