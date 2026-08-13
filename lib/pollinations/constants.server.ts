import 'server-only'

/** Integration row provider id for stored Pollinations credentials (OAuth + manual key). */
export const POLLINATIONS_INTEGRATION_PROVIDER = 'pollinations_media'

export const POLLINATIONS_ENTER_BASE = 'https://enter.pollinations.ai'
export const POLLINATIONS_AUTHORIZE_URL = `${POLLINATIONS_ENTER_BASE}/authorize`
export const POLLINATIONS_TOKEN_URL = `${POLLINATIONS_ENTER_BASE}/api/oauth/token`
export const POLLINATIONS_USERINFO_URL = `${POLLINATIONS_ENTER_BASE}/api/oauth/userinfo`
export const POLLINATIONS_OAUTH_DISCOVERY_URL = `${POLLINATIONS_ENTER_BASE}/.well-known/oauth-authorization-server`

/** OAuth scopes requested for BYOP (balance visibility + profile on consent screen). */
export const POLLINATIONS_OAUTH_SCOPES = 'profile usage'

/** Default authorized key lifetime (days) — user can override on consent screen. */
export const POLLINATIONS_OAUTH_DEFAULT_EXPIRY_DAYS = 7
