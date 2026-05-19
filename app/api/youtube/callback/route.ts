// GET /api/youtube/callback — exchange code, fetch channel, upsert row, redirect.
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createYoutubeOAuthClient, fetchMyChannel } from '@/lib/youtube'
import { safeRelative } from '@/lib/url'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const state = url.searchParams.get('state')

  let redirectTo = '/settings'
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
      if (typeof decoded?.redirectTo === 'string') {
        redirectTo = safeRelative(decoded.redirectTo, '/settings')
      }
    }
  } catch {}

  const fail = (reason: string) => {
    const u = new URL(redirectTo, req.url)
    u.searchParams.set('yt_error', reason)
    return NextResponse.redirect(u)
  }

  if (!user) return fail('unauthenticated')
  if (error) return fail(error)
  if (!code)  return fail('missing_code')

  try {
    const oauth = createYoutubeOAuthClient()
    const { tokens } = await oauth.getToken(code)
    oauth.setCredentials(tokens)

    if (!tokens.access_token) return fail('no_access_token')
    const channel = await fetchMyChannel(tokens.access_token)
    if (!channel || !channel.id || !channel.snippet?.title) return fail('no_channel')

    const expMs = tokens.expiry_date || (Date.now() + 55 * 60_000)
    const { error: upErr } = await supabase.from('youtube_accounts').upsert({
      user_id: user.id,
      access_token:  tokens.access_token  || '',
      refresh_token: tokens.refresh_token || '',
      expires_at:    new Date(expMs).toISOString(),
      scope:         tokens.scope || null,
      token_type:    tokens.token_type || null,
      channel_id:    channel.id,
      channel_title: channel.snippet.title,
      channel_thumb: channel.snippet.thumbnails?.default?.url || null,
    }, { onConflict: 'user_id' })
    if (upErr) { console.error('[yt-callback] upsert', upErr); return fail('db_error') }

    const ok = new URL(redirectTo, req.url)
    ok.searchParams.set('yt_connected', '1')
    return NextResponse.redirect(ok)
  } catch (e: any) {
    console.error('[yt-callback]', e?.response?.data || e?.message || e)
    return fail('oauth_error')
  }
}
