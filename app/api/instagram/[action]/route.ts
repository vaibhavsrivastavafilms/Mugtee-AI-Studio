import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import {
  getMetaCreds, metaCredsReady, getInstagramApiBase,
  validateToken, publishImage, publishReel, publishCarousel, getPublishingLimit,
  IGPublishError, type MetaApiError,
} from '@/lib/instagram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const META_APP_ID = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET
const GRAPH = 'https://graph.facebook.com/v20.0'
const FB_OAUTH = 'https://www.facebook.com/v20.0/dialog/oauth'
const SCOPES = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }) } catch {} },
        remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
      },
    }
  )
}

function redirectUri(req: NextRequest) {
  const origin = new URL(req.url).origin
  return `${origin}/api/instagram/callback`
}

async function notify(supabase: any, user_id: string, payload: { title: string; message?: string | null; type?: string; link?: string | null }) {
  try {
    await supabase.from('notifications').insert({
      user_id, title: payload.title, message: payload.message ?? null, type: payload.type ?? 'info', link: payload.link ?? null,
    })
  } catch (e) { console.error('notify', e) }
}

// =====================================================================
// GET — handles /connect (redirect to FB OAuth) + /callback (code exchange)
// =====================================================================
export async function GET(req: NextRequest, { params }: { params: { action: string } }) {
  const action = params.action
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  if (action === 'connect') {
    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.json({ error: 'META_APP_ID / META_APP_SECRET not configured. Add them in /app/.env then restart the server.' }, { status: 500 })
    }
    const state = Buffer.from(JSON.stringify({ uid: user.id, ts: Date.now() })).toString('base64url')
    const url = `${FB_OAUTH}?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri(req))}&state=${state}&scope=${encodeURIComponent(SCOPES)}&response_type=code`
    return NextResponse.redirect(url)
  }

  if (action === 'callback') {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const err = url.searchParams.get('error_description') || url.searchParams.get('error')
    const back = (msg: string, ok = false) => NextResponse.redirect(new URL(`/settings?ig=${ok ? 'connected' : 'error'}&msg=${encodeURIComponent(msg)}`, req.url))
    if (err) return back(err)
    if (!code) return back('Missing authorization code')
    if (!META_APP_ID || !META_APP_SECRET) return back('META_APP_ID / META_APP_SECRET missing on the server')

    try {
      // 1) Exchange code -> short-lived user token
      const shortRes = await fetch(`${GRAPH}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri(req))}&code=${code}`)
      const shortJson = await shortRes.json()
      if (!shortRes.ok || !shortJson.access_token) throw new Error(shortJson?.error?.message || 'Could not exchange code')
      const shortToken = shortJson.access_token as string

      // 2) Short-lived -> long-lived user token (~60 days)
      const longRes = await fetch(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortToken}`)
      const longJson = await longRes.json()
      if (!longRes.ok || !longJson.access_token) throw new Error(longJson?.error?.message || 'Could not get long-lived token')
      const userLongToken = longJson.access_token as string
      const expiresInSec = Number(longJson.expires_in || 60 * 24 * 60 * 60)
      const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString()

      // 3) Get pages (each page has its OWN page access token — that's what we store for publishing)
      const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userLongToken}`)
      const pagesJson = await pagesRes.json()
      if (!pagesRes.ok) throw new Error(pagesJson?.error?.message || 'Could not list pages')
      const pages = (pagesJson.data || []) as any[]
      const igPage = pages.find(p => p.instagram_business_account?.id)
      if (!igPage) throw new Error('No Instagram Business account found. Convert your IG to Professional and link to a Facebook Page first.')

      const igId = igPage.instagram_business_account.id
      const pageId = igPage.id
      const pageToken = igPage.access_token

      // 4) Fetch IG username for nicer UI
      let username: string | null = null
      try {
        const igRes = await fetch(`${GRAPH}/${igId}?fields=username&access_token=${pageToken}`)
        const igJson = await igRes.json()
        if (igRes.ok) username = igJson.username || null
      } catch {}

      // 5) Upsert
      const { error: upErr } = await supabase.from('instagram_accounts').upsert({
        user_id: user.id,
        ig_business_id: igId,
        page_id: pageId,
        page_access_token: pageToken,
        username,
        connected_at: new Date().toISOString(),
        expires_at: expiresAt,
      }, { onConflict: 'user_id' })
      if (upErr) throw new Error(upErr.message)

      await notify(supabase, user.id, { title: 'Instagram connected', message: username ? `@${username} is ready to publish` : 'Account linked', type: 'info', link: '/settings' })
      return back('Connected', true)
    } catch (e: any) {
      console.error('IG callback error', e)
      return back(e?.message || 'Connection failed')
    }
  }

  if (action === 'status') {
    const { data } = await supabase.from('instagram_accounts').select('username, ig_business_id, connected_at, expires_at').eq('user_id', user.id).maybeSingle()
    return NextResponse.json({ connected: !!data, account: data || null })
  }

  if (action === 'disconnect') {
    await supabase.from('instagram_accounts').delete().eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  // -------------------------------------------------------------------
  // validate — confirm the current user's stored IG token still works.
  // Falls back to the INSTAGRAM_ACCESS_TOKEN env var when the user
  // hasn't OAuth-connected yet (dev mode convenience).
  // -------------------------------------------------------------------
  if (action === 'validate') {
    const { data: ig } = await supabase.from('instagram_accounts').select('*').eq('user_id', user.id).maybeSingle()
    const creds = getMetaCreds()
    const token = ig?.page_access_token || creds.envAccessToken
    const source: 'user' | 'env' | 'none' = ig?.page_access_token ? 'user' : (creds.envAccessToken ? 'env' : 'none')

    if (!token) {
      return NextResponse.json({
        valid: false,
        source,
        error: { message: 'No Instagram token available. Connect your Instagram from Settings.', is_token_expired: false, is_permission: false },
      })
    }

    const result = await validateToken(token)
    return NextResponse.json({
      valid: result.valid,
      source,
      ig_business_id: ig?.ig_business_id ?? null,
      username: ig?.username ?? result.username ?? null,
      stored_expires_at: ig?.expires_at ?? null,
      live_expires_at: result.expires_at ?? null,
      scopes: result.scopes ?? null,
      error: result.error ?? null,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
}

// =====================================================================
// POST — handles /publish (queue-based) + /publish-image, /publish-carousel, /publish-reel (direct)
// =====================================================================
export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // -------------------------------------------------------------------
  // Direct publish endpoints (no queue row required).
  // Body: { caption?: string, image_url?: string, video_url?: string,
  //         media_urls?: string[], share_to_feed?: boolean }
  // -------------------------------------------------------------------
  if (params.action === 'publish-image' || params.action === 'publish-carousel' || params.action === 'publish-reel') {
    if (!metaCredsReady()) {
      return NextResponse.json({ error: 'Meta credentials not configured on the server.' }, { status: 500 })
    }
    const body = await req.json().catch(() => ({}))
    const caption: string = String(body?.caption || '').trim()

    // Resolve IG account — user's stored row OR dev fallback to env access token.
    // For the env-fallback path we still need an ig_business_id; require it in the
    // request body OR pulled from `instagram_accounts` if any row exists.
    const { data: ig } = await supabase.from('instagram_accounts').select('*').eq('user_id', user.id).maybeSingle()
    const creds = getMetaCreds()
    const igBusinessId: string | null = ig?.ig_business_id || String(body?.ig_business_id || '') || null
    const token: string | null = ig?.page_access_token || creds.envAccessToken || null
    if (!igBusinessId) {
      return NextResponse.json({ error: 'No Instagram Business account on file. Connect IG in Settings, or pass ig_business_id in the body.' }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ error: 'No Instagram access token available. Connect IG in Settings, or set INSTAGRAM_ACCESS_TOKEN.' }, { status: 400 })
    }

    try {
      let result
      if (params.action === 'publish-image') {
        const imageUrl: string = String(body?.image_url || body?.media_url || '').trim()
        if (!imageUrl) return NextResponse.json({ error: 'image_url required' }, { status: 400 })
        result = await publishImage(igBusinessId, imageUrl, caption, token)
      } else if (params.action === 'publish-reel') {
        const videoUrl: string = String(body?.video_url || body?.media_url || '').trim()
        if (!videoUrl) return NextResponse.json({ error: 'video_url required' }, { status: 400 })
        result = await publishReel(igBusinessId, videoUrl, caption, token, { share_to_feed: body?.share_to_feed !== false })
      } else {
        // publish-carousel
        const urls: string[] = Array.isArray(body?.media_urls) ? body.media_urls.map((u: any) => String(u).trim()).filter(Boolean) : []
        if (urls.length < 2 || urls.length > 10) return NextResponse.json({ error: 'media_urls must contain 2–10 entries' }, { status: 400 })
        result = await publishCarousel(igBusinessId, urls, caption, token)
      }

      // Best-effort: log a notification so the user sees it land in the UI.
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Published to Instagram',
          message: caption ? caption.slice(0, 120) : (result.permalink || result.media_id),
          type: 'publish',
          link: result.permalink || null,
        })
      } catch {}

      return NextResponse.json(result)
    } catch (e: any) {
      const meta: MetaApiError = (e instanceof IGPublishError ? e.meta : null) || {
        message: e?.message || 'Publish failed', is_token_expired: false, is_permission: false,
      }
      const status = meta.is_token_expired ? 401 : 502
      return NextResponse.json({ error: meta.message, meta }, { status })
    }
  }

  // -------------------------------------------------------------------
  // Existing queue-based publish — unchanged.
  // -------------------------------------------------------------------
  if (params.action !== 'publish') return NextResponse.json({ error: 'Unknown action' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const queueId = String(body?.queue_id || '')
  if (!queueId) return NextResponse.json({ error: 'queue_id required' }, { status: 400 })

  // 1) Load queue + content
  const { data: queueRow, error: qErr } = await supabase.from('publishing_queue').select('*').eq('id', queueId).eq('user_id', user.id).maybeSingle()
  if (qErr || !queueRow) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
  if (queueRow.status === 'published') return NextResponse.json({ ok: true, already: true, post_url: queueRow.post_url })

  const { data: content } = await supabase.from('content_pieces').select('*').eq('id', queueRow.content_id).eq('user_id', user.id).maybeSingle()
  if (!content) return await failPublish(supabase, user.id, queueRow, 'Content piece not found')

  // 2) Validate publishing prerequisites
  const mediaUrl: string | null = content.media_url || null
  const caption: string | null = content.description || null
  if (!mediaUrl) return await failPublish(supabase, user.id, queueRow, 'No media attached. Add a media URL on the content card.')
  if (!caption) return await failPublish(supabase, user.id, queueRow, 'Caption is empty. Add a description first.')

  // 3) Load IG account
  const { data: ig } = await supabase.from('instagram_accounts').select('*').eq('user_id', user.id).maybeSingle()
  if (!ig) return await failPublish(supabase, user.id, queueRow, 'Instagram not connected. Reconnect from Settings → Integrations.')

  // 4) Mark publishing
  await supabase.from('publishing_queue').update({ status: 'publishing', error: null }).eq('id', queueId)

  // Dual-host: tokens starting with "IGAA" → graph.instagram.com; otherwise → graph.facebook.com.
  // This keeps both legacy FB-Page tokens and new IG-Login tokens working through the queue path.
  const apiHost = getInstagramApiBase(ig.page_access_token)
  console.log('[Instagram API Host]', apiHost, '(queue-based publish)', { queueId, ig_business_id: ig.ig_business_id })

  try {
    const isVideo = /\.(mp4|mov|m4v)(\?|$)/i.test(mediaUrl)
    const isImage = /\.(jpg|jpeg|png|webp)(\?|$)/i.test(mediaUrl)
    if (!isVideo && !isImage) throw new Error('Unsupported media. Use .mp4 / .mov for Reels or .jpg / .png for Feed.')

    // 5) Create container
    const createParams = new URLSearchParams()
    if (isVideo) {
      createParams.set('media_type', 'REELS')
      createParams.set('video_url', mediaUrl)
    } else {
      createParams.set('image_url', mediaUrl)
    }
    createParams.set('caption', caption)
    createParams.set('access_token', ig.page_access_token)

    const createRes = await fetch(`${apiHost}/${ig.ig_business_id}/media`, { method: 'POST', body: createParams })
    const createJson = await createRes.json()
    if (!createRes.ok || !createJson.id) throw new Error(createJson?.error?.message || 'Failed to create media container')
    const creationId = createJson.id as string

    // 6) For videos: poll status until FINISHED (max ~ 25s)
    if (isVideo) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2500))
        const stRes = await fetch(`${apiHost}/${creationId}?fields=status_code,status&access_token=${ig.page_access_token}`)
        const stJson = await stRes.json()
        if (stJson?.status_code === 'FINISHED') break
        if (stJson?.status_code === 'ERROR' || stJson?.status_code === 'EXPIRED') {
          throw new Error(stJson?.status || `Container ${stJson?.status_code}`)
        }
      }
    }

    // 7) Publish container
    const pubParams = new URLSearchParams()
    pubParams.set('creation_id', creationId)
    pubParams.set('access_token', ig.page_access_token)
    const pubRes = await fetch(`${apiHost}/${ig.ig_business_id}/media_publish`, { method: 'POST', body: pubParams })
    const pubJson = await pubRes.json()
    if (!pubRes.ok || !pubJson.id) throw new Error(pubJson?.error?.message || 'Publish failed')
    const mediaId = pubJson.id as string

    // 8) Get permalink
    let postUrl: string | null = null
    try {
      const plRes = await fetch(`${apiHost}/${mediaId}?fields=permalink&access_token=${ig.page_access_token}`)
      const plJson = await plRes.json()
      if (plRes.ok) postUrl = plJson.permalink || null
    } catch {}

    // 9) Mark published + sync content
    const publishedAt = new Date().toISOString()
    await supabase.from('publishing_queue').update({ status: 'published', post_url: postUrl, published_at: publishedAt, error: null }).eq('id', queueId)
    await supabase.from('content_pieces').update({ status: 'published' }).eq('id', queueRow.content_id)
    await notify(supabase, user.id, { title: 'Published to Instagram', message: `“${content.title}” is live${postUrl ? ' — ' + postUrl : ''}`, type: 'publish', link: postUrl || '/automations' })

    return NextResponse.json({ ok: true, post_url: postUrl })
  } catch (e: any) {
    return await failPublish(supabase, user.id, queueRow, e?.message || 'Publish failed')
  }
}

async function failPublish(supabase: any, user_id: string, queueRow: any, message: string) {
  await supabase.from('publishing_queue').update({ status: 'failed', error: message }).eq('id', queueRow.id)
  const tokenIssue = /token|permission|access|OAuthException/i.test(message)
  await supabase.from('notifications').insert({
    user_id,
    title: tokenIssue ? 'Instagram reconnect needed' : 'Publish failed',
    message,
    type: 'overdue',
    link: tokenIssue ? '/settings?ig=reconnect' : '/automations',
  })
  return NextResponse.json({ error: message }, { status: 502 })
}
