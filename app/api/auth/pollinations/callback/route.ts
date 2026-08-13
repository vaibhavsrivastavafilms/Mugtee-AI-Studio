import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import {
  exchangePollinationsAuthorizationCode,
  resolvePollinationsOAuthConfiguration,
  storePollinationsOAuthConnection,
} from '@/lib/pollinations/oauth.server'
import { buildApplicationRedirectUrl, safeRelative } from '@/lib/url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PKCE_COOKIE = 'pollinations_oauth_verifier'
const STATE_COOKIE = 'pollinations_oauth_state'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  let redirectTo = '/settings'

  if (oauthError) {
    return NextResponse.redirect(
      buildApplicationRedirectUrl('/settings', {
        pollinations_error: oauthError,
      })
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      buildApplicationRedirectUrl('/settings', { pollinations_error: 'missing_code' })
    )
  }

  const cookieStore = await cookies()
  const verifier = cookieStore.get(PKCE_COOKIE)?.value
  const expectedState = cookieStore.get(STATE_COOKIE)?.value

  if (!verifier || !expectedState || expectedState !== state) {
    return NextResponse.redirect(
      buildApplicationRedirectUrl('/settings', { pollinations_error: 'invalid_state' })
    )
  }

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      userId?: string
      redirectTo?: string
    }
    redirectTo = safeRelative(parsed.redirectTo ?? '/settings', '/settings')
  } catch {
    redirectTo = '/settings'
  }

  const supabase = await tryCreateSupabaseServerClient()
  if (!supabase) {
    return NextResponse.redirect(
      buildApplicationRedirectUrl(redirectTo, { pollinations_error: 'server_unavailable' })
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(buildApplicationRedirectUrl('/auth/login', { next: redirectTo }))
  }

  let oauthConfig
  try {
    oauthConfig = resolvePollinationsOAuthConfiguration()
  } catch {
    return NextResponse.redirect(
      buildApplicationRedirectUrl(redirectTo, { pollinations_error: 'not_configured' })
    )
  }

  try {
    const token = await exchangePollinationsAuthorizationCode({
      code,
      clientId: oauthConfig.clientId,
      redirectUri: oauthConfig.redirectUri,
      codeVerifier: verifier,
    })

    await storePollinationsOAuthConnection({
      supabase,
      userId: user.id,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scope: token.scope,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'connect_failed'
    return NextResponse.redirect(
      buildApplicationRedirectUrl(redirectTo, { pollinations_error: 'connect_failed' })
    )
  }

  const response = NextResponse.redirect(
    buildApplicationRedirectUrl(redirectTo, { pollinations_connected: '1' })
  )
  response.cookies.set(PKCE_COOKIE, '', { path: '/', maxAge: 0 })
  response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
