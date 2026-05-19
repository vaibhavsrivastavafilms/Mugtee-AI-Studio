// Phase P4 — YouTube OAuth + upload helpers.
// IMPORTANT: We import only `google-auth-library` (small) instead of the full `googleapis`
// to keep the dev-server memory footprint low. All YouTube REST calls are made with raw fetch.
import { OAuth2Client } from 'google-auth-library'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
]

export function getRedirectUri() {
  return process.env.YOUTUBE_REDIRECT_URI
      || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/youtube/callback`
}

export function createYoutubeOAuthClient() {
  const id     = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!id || !secret) throw new Error('Google OAuth keys missing')
  return new OAuth2Client(id, secret, getRedirectUri())
}

export function buildAuthUrl(state: string) {
  return createYoutubeOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    include_granted_scopes: true,
    state,
  })
}

/**
 * Returns a fresh OAuth2 client + the youtube_accounts row. Refreshes if near-expiry.
 * Throws Error('not_connected') | Error('invalid_grant') | Error('refresh_failed').
 */
export async function getFreshYoutubeCredentials() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { data: row, error } = await supabase
    .from('youtube_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error('db_error')
  if (!row) throw new Error('not_connected')

  const oauth = createYoutubeOAuthClient()
  const expiresMs = new Date(row.expires_at).getTime()
  oauth.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: expiresMs,
  })

  const needsRefresh = expiresMs - Date.now() < 60_000
  if (!needsRefresh) return { account: row, oauth, userId: user.id }

  try {
    const { credentials } = await oauth.refreshAccessToken()
    const newExpMs = credentials.expiry_date || (Date.now() + 55 * 60_000)
    const updated = {
      access_token:  credentials.access_token  || row.access_token,
      refresh_token: credentials.refresh_token || row.refresh_token,
      expires_at:    new Date(newExpMs).toISOString(),
      scope:         credentials.scope || row.scope,
      token_type:    credentials.token_type || row.token_type,
    }
    await supabase.from('youtube_accounts').update(updated).eq('user_id', user.id)
    return { account: { ...row, ...updated }, oauth, userId: user.id }
  } catch (e: any) {
    const reason = e?.response?.data?.error || e?.message || ''
    if (String(reason).includes('invalid_grant')) {
      await supabase.from('youtube_accounts').delete().eq('user_id', user.id)
      throw new Error('invalid_grant')
    }
    throw new Error('refresh_failed')
  }
}

/** GET https://www.googleapis.com/youtube/v3/channels?mine=true&part=id,snippet */
export async function fetchMyChannel(accessToken: string) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/channels?mine=true&part=id,snippet', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`channels.list failed: ${r.status} ${txt.slice(0, 200)}`)
  }
  const j = await r.json() as any
  return j?.items?.[0] || null
}
