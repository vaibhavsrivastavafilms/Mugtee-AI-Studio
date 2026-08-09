import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { safeRelative, buildApplicationRedirectUrl, resolveApplicationOrigin } from '@/lib/url'
import {
  exchangeOpenArtAuthorizationCode,
  invalidateOpenArtOAuthCaches,
  markOpenArtOAuthProviderReady,
  persistOpenArtTokensForUser,
  resolveOpenArtOAuthRedirectUri,
} from '@/lib/openart/oauth.server'
import { authenticateOpenArtForUser } from '@/lib/openart/authenticate.server'
import {
  getOpenArtOAuthAuditSnapshot,
  recordOpenArtOAuthAudit,
  recordOpenArtOAuthFailure,
} from '@/lib/openart/oauth-audit.server'
import { isOpenArtOAuthError } from '@/lib/openart/oauth-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PKCE_COOKIE = 'openart_oauth_verifier'
const STATE_COOKIE = 'openart_oauth_state'

type ParsedOAuthState = {
  userId?: string
  redirectTo?: string
  clientId?: string
}

function readIncomingHost(req: Request): string | null {
  return req.headers.get('x-forwarded-host') || req.headers.get('host')
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.delete(PKCE_COOKIE)
  response.cookies.delete(STATE_COOKIE)
}

function parseOAuthState(stateParam: string | null): ParsedOAuthState {
  if (!stateParam) return {}
  try {
    return JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf8')) as ParsedOAuthState
  } catch {
    return {}
  }
}

function failRedirect(
  redirectTo: string,
  code: string,
  options?: { clearCookies?: boolean }
): NextResponse {
  const target = buildApplicationRedirectUrl(redirectTo, { openart_error: code })
  const response = NextResponse.redirect(target)
  if (options?.clearCookies !== false) clearOAuthCookies(response)
  return response
}

export async function GET(req: Request) {
  const audit = getOpenArtOAuthAuditSnapshot()
  const requestId = audit.requestId || crypto.randomUUID()
  const incomingHost = readIncomingHost(req)
  const resolvedOrigin = resolveApplicationOrigin()
  const redirectUri = resolveOpenArtOAuthRedirectUri()
  const callbackUrl = new URL(req.url)

  recordOpenArtOAuthAudit({ callbackReached: true, redirectUri })

  const code = callbackUrl.searchParams.get('code')
  const oauthError = callbackUrl.searchParams.get('error')
  const stateParam = callbackUrl.searchParams.get('state')

  const cookieStore = cookies()
  const verifier = cookieStore.get(PKCE_COOKIE)?.value
  const expectedState = cookieStore.get(STATE_COOKIE)?.value
  const parsedState = parseOAuthState(stateParam)

  let redirectTo = safeRelative(parsedState.redirectTo, '/settings')

  const stateValid = Boolean(stateParam && expectedState && stateParam === expectedState)
  const pkceValid = Boolean(verifier)

  recordOpenArtOAuthAudit({
    authorizationCode: Boolean(code),
    pkceVerified: pkceValid && stateValid,
  })

  console.info('[openart-oauth] callback', {
    requestId,
    provider: 'openart',
    incomingHost,
    resolvedOrigin,
    redirectUri,
    redirectTo,
    authorizationCodePresent: Boolean(code),
    pkceCookiePresent: Boolean(verifier),
    stateCookiePresent: Boolean(expectedState),
    stateParamPresent: Boolean(stateParam),
    stateValid,
    pkceValid,
    clientIdPresent: Boolean(parsedState.clientId),
    oauthError: oauthError ?? null,
  })

  const supabase = await tryCreateSupabaseServerClient()
  if (!supabase) {
    recordOpenArtOAuthFailure('CALLBACK', 'Supabase not configured')
    return failRedirect(redirectTo, 'OPENART_STATUS_READ_FAILED', { clearCookies: false })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    recordOpenArtOAuthFailure('CALLBACK', 'User not authenticated')
    return failRedirect(redirectTo, 'OPENART_NOT_AUTHENTICATED', { clearCookies: false })
  }

  if (parsedState.userId && parsedState.userId !== user.id) {
    recordOpenArtOAuthFailure('INVALID_STATE', 'State userId mismatch')
    return failRedirect(redirectTo, 'OPENART_INVALID_STATE')
  }

  if (oauthError) {
    recordOpenArtOAuthFailure('CALLBACK', oauthError)
    return failRedirect(redirectTo, oauthError)
  }

  if (!code) {
    recordOpenArtOAuthFailure('MISSING_CODE', 'Authorization code missing from callback')
    return failRedirect(redirectTo, 'OPENART_MISSING_CODE')
  }

  if (!verifier) {
    recordOpenArtOAuthFailure('MISSING_PKCE', 'PKCE verifier cookie missing')
    return failRedirect(redirectTo, 'OPENART_MISSING_PKCE')
  }

  if (!stateValid) {
    recordOpenArtOAuthFailure('INVALID_STATE', 'OAuth state validation failed')
    return failRedirect(redirectTo, 'OPENART_INVALID_STATE')
  }

  const clientId = parsedState.clientId?.trim()
  if (!clientId) {
    recordOpenArtOAuthFailure('INVALID_STATE', 'OAuth client_id missing from state payload')
    return failRedirect(redirectTo, 'OPENART_INVALID_STATE')
  }

  try {
    console.info('[openart-oauth] Token Exchange Success path start', {
      requestId,
      userId: user.id,
      redirectUri,
      clientIdPrefix: clientId.slice(0, 8),
    })

    const tokens = await exchangeOpenArtAuthorizationCode({
      code,
      codeVerifier: verifier,
      clientId,
    })
    recordOpenArtOAuthAudit({ tokenExchanged: true })

    await persistOpenArtTokensForUser(user.id, tokens)
    recordOpenArtOAuthAudit({ tokenPersisted: true })

    await invalidateOpenArtOAuthCaches(user.id)
    markOpenArtOAuthProviderReady()

    const auth = await authenticateOpenArtForUser(user.id, { discover: true, force: true })
    recordOpenArtOAuthAudit({
      cacheInvalidated: true,
      providerReady: auth.ready,
    })
    console.info('[openart-oauth] authenticate result', {
      requestId,
      userId: user.id,
      ready: auth.ready,
      error: auth.error,
      reason: auth.reason,
      workspace: auth.workspace,
      imageTool: auth.imageTool,
    })

    const successTarget = buildApplicationRedirectUrl(redirectTo, { openart_connected: '1' })
    console.info('[openart-oauth] callback success', {
      requestId,
      userId: user.id,
      redirectTarget: successTarget,
      resolvedOrigin,
    })

    const response = NextResponse.redirect(successTarget)
    clearOAuthCookies(response)
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    const code = isOpenArtOAuthError(err) ? err.code : 'OPENART_TOKEN_EXCHANGE_FAILED'

    recordOpenArtOAuthFailure(
      code === 'OPENART_TOKEN_PERSIST_FAILED' ? 'TOKEN_PERSIST' : 'TOKEN_EXCHANGE',
      message,
      { stack, requestId, userId: user.id }
    )

    return failRedirect(redirectTo, code)
  }
}
