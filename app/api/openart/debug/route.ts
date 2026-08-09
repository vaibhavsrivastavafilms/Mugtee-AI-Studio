import { NextResponse } from 'next/server'

import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'

import { authenticateOpenArtForUser } from '@/lib/openart/authenticate.server'

import { getOpenArtOAuthAuditSnapshot } from '@/lib/openart/oauth-audit.server'

import {

  diagnoseOpenArtConnection,

  resolveOpenArtOAuthConfiguration,

} from '@/lib/openart/oauth.server'

import { isOpenArtOAuthError } from '@/lib/openart/oauth-errors.server'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'



/** Development-only OAuth lifecycle diagnostics. */

export async function GET() {

  if (process.env.NODE_ENV === 'production') {

    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  }



  const audit = getOpenArtOAuthAuditSnapshot()

  const supabase = await tryCreateSupabaseServerClient()

  const userId = supabase

    ? (await supabase.auth.getUser()).data.user?.id

    : undefined



  let oauthConfig: Awaited<ReturnType<typeof resolveOpenArtOAuthConfiguration>> | null = null

  let clientResolutionError: string | null = null

  try {

    oauthConfig = await resolveOpenArtOAuthConfiguration()

  } catch (err) {

    clientResolutionError = isOpenArtOAuthError(err)

      ? `${err.code}: ${err.message}`

      : err instanceof Error

        ? err.message

        : String(err)

  }



  const diagnosis = userId ? await diagnoseOpenArtConnection(userId) : null

  const auth = userId ? await authenticateOpenArtForUser(userId, { discover: true, force: true }) : null



  const clientIdPresent = Boolean(oauthConfig?.clientId)

  const clientId = oauthConfig?.clientId ?? audit.clientId ?? null

  const redirectUri = oauthConfig?.redirectUri ?? audit.redirectUri ?? null



  return NextResponse.json({

    oauthStarted: audit.oauthStarted || clientIdPresent,

    callbackReached: audit.callbackReached,

    authorizationCode: audit.authorizationCode,

    pkceVerified: audit.pkceVerified,

    tokenExchange: audit.tokenExchanged,

    tokenExchanged: audit.tokenExchanged,

    tokenPersisted: audit.tokenPersisted,

    cacheInvalidated: audit.cacheInvalidated,

    credentialsLoaded: Boolean(auth?.accessToken || diagnosis?.hasAccessToken),

    authenticatePassed: Boolean(auth?.ready),

    providerReady: Boolean(auth?.ready || audit.providerReady),

    clientIdPresent,

    clientId,

    redirectUri,

    clientSource: oauthConfig?.source ?? null,

    clientResolutionError,

    failureStep:

      audit.failureStep ??

      (clientResolutionError ? 'OAUTH_START' : auth?.ready ? null : auth?.error ?? diagnosis?.error ?? null),

    lastError: audit.lastError ?? clientResolutionError ?? auth?.reason ?? diagnosis?.reason ?? null,

    requestId: audit.requestId,

    updatedAt: audit.updatedAt,

    diagnosis,

    auth,

  })

}

