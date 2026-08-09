import 'server-only'

export type OpenArtOAuthFailureStep =
  | 'OAUTH_START'
  | 'CALLBACK'
  | 'MISSING_CODE'
  | 'INVALID_STATE'
  | 'MISSING_PKCE'
  | 'TOKEN_EXCHANGE'
  | 'TOKEN_PERSIST'
  | 'CACHE_INVALIDATION'
  | 'STATUS_READ'
  | null

export type OpenArtOAuthAuditSnapshot = {
  requestId: string
  oauthStarted: boolean
  callbackReached: boolean
  authorizationCode: boolean
  pkceVerified: boolean
  tokenExchanged: boolean
  tokenPersisted: boolean
  cacheInvalidated: boolean
  providerReady: boolean
  failureStep: OpenArtOAuthFailureStep
  lastError: string | null
  redirectUri: string | null
  clientId: string | null
  clientIdPresent: boolean
  updatedAt: string
}

const defaultSnapshot = (): OpenArtOAuthAuditSnapshot => ({
  requestId: '',
  oauthStarted: false,
  callbackReached: false,
  authorizationCode: false,
  pkceVerified: false,
  tokenExchanged: false,
  tokenPersisted: false,
  cacheInvalidated: false,
  providerReady: false,
  failureStep: null,
  lastError: null,
  redirectUri: null,
  clientId: null,
  clientIdPresent: false,
  updatedAt: new Date().toISOString(),
})

let auditState: OpenArtOAuthAuditSnapshot = defaultSnapshot()

function touch(partial: Partial<OpenArtOAuthAuditSnapshot>): void {
  auditState = {
    ...auditState,
    ...partial,
    updatedAt: new Date().toISOString(),
  }
}

export function resetOpenArtOAuthAudit(requestId: string): void {
  auditState = {
    ...defaultSnapshot(),
    requestId,
    oauthStarted: true,
    updatedAt: new Date().toISOString(),
  }
}

export function recordOpenArtOAuthAudit(
  partial: Partial<OpenArtOAuthAuditSnapshot> & { failureStep?: OpenArtOAuthFailureStep }
): void {
  touch(partial)
}

export function recordOpenArtOAuthFailure(
  step: Exclude<OpenArtOAuthFailureStep, null>,
  message: string,
  meta?: Record<string, unknown>
): void {
  console.error('[openart-oauth] failure', {
    requestId: auditState.requestId,
    provider: 'openart',
    failureStep: step,
    message,
    stack: meta?.stack,
    ...meta,
  })
  touch({
    failureStep: step,
    lastError: message,
  })
}

export function getOpenArtOAuthAuditSnapshot(): OpenArtOAuthAuditSnapshot {
  return { ...auditState }
}
