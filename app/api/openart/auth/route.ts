import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { safeRelative, resolveApplicationOrigin } from '@/lib/url'
import {
  buildOpenArtAuthorizationUrl,
  createOpenArtPkcePair,
  resolveOpenArtOAuthConfiguration,
} from '@/lib/openart/oauth.server'
import {
  resetOpenArtOAuthAudit,
  recordOpenArtOAuthAudit,
  recordOpenArtOAuthFailure,
} from '@/lib/openart/oauth-audit.server'
import { isOpenArtOAuthError } from '@/lib/openart/oauth-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PKCE_COOKIE = 'openart_oauth_verifier'
const STATE_COOKIE = 'openart_oauth_state'

export async function GET(req: Request) {
  const requestId = crypto.randomUUID()
  resetOpenArtOAuthAudit(requestId)

  const supabase = await tryCreateSupabaseServerClient()
  if (!supabase) {
    recordOpenArtOAuthFailure('OAUTH_START', 'Supabase not configured')
    return NextResponse.json({ error: 'OPENART_STATUS_READ_FAILED', message: 'Supabase not configured' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    recordOpenArtOAuthFailure('OAUTH_START', 'User not authenticated')
    return NextResponse.json({ error: 'OPENART_NOT_AUTHENTICATED', message: 'Sign in to connect OpenArt MCP.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const redirectTo = safeRelative(url.searchParams.get('redirect') ?? '/settings', '/settings')

  let oauthConfig
  try {
    oauthConfig = await resolveOpenArtOAuthConfiguration()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    recordOpenArtOAuthFailure('OAUTH_START', message, {
      stack: err instanceof Error ? err.stack : undefined,
      userId: user.id,
    })
    if (isOpenArtOAuthError(err)) {
      return NextResponse.json(err.toJSON(), { status: 503 })
    }
    return NextResponse.json(
      {
        error: 'OPENART_CLIENT_REGISTRATION_FAILED',
        message,
        provider: 'openart',
        requestId,
      },
      { status: 503 }
    )
  }

  const { verifier, challenge } = createOpenArtPkcePair()
  const clientId = oauthConfig.clientId
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      redirectTo,
      clientId,
      nonce: crypto.randomUUID(),
    }),
    'utf8'
  ).toString('base64url')

  const resolvedOrigin = resolveApplicationOrigin()
  const redirectUri = oauthConfig.redirectUri
  const authUrl = await buildOpenArtAuthorizationUrl({
    state,
    codeChallenge: challenge,
    clientId,
  })

  recordOpenArtOAuthAudit({
    redirectUri,
    clientId,
    clientIdPresent: true,
    oauthStarted: true,
  })

  console.info('[openart-oauth] OAuth Start', {
    requestId,
    provider: 'openart',
    userId: user.id,
    incomingHost: req.headers.get('x-forwarded-host') || req.headers.get('host'),
    resolvedOrigin,
    redirectUri,
    redirectTo,
    clientId,
    clientSource: oauthConfig.source,
    authorizationUrl: authUrl,
    pkceGenerated: true,
    stateGenerated: true,
  })

  const response = NextResponse.redirect(authUrl)
  response.cookies.set(PKCE_COOKIE, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
