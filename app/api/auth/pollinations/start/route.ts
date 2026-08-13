import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import {
  buildPollinationsAuthorizationUrl,
  createPollinationsPkcePair,
  resolvePollinationsOAuthConfiguration,
} from '@/lib/pollinations/oauth.server'
import { safeRelative } from '@/lib/url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PKCE_COOKIE = 'pollinations_oauth_verifier'
const STATE_COOKIE = 'pollinations_oauth_state'

export async function GET(req: Request) {
  const supabase = await tryCreateSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let oauthConfig
  try {
    oauthConfig = resolvePollinationsOAuthConfiguration()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pollinations OAuth not configured'
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }

  const url = new URL(req.url)
  const redirectTo = safeRelative(url.searchParams.get('redirect') ?? '/settings', '/settings')
  const { verifier, challenge } = createPollinationsPkcePair()
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      redirectTo,
      nonce: crypto.randomUUID(),
    }),
    'utf8'
  ).toString('base64url')

  const authUrl = buildPollinationsAuthorizationUrl({
    clientId: oauthConfig.clientId,
    redirectUri: oauthConfig.redirectUri,
    state,
    codeChallenge: challenge,
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
