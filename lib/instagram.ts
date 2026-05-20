// =====================================================================
// MUGTEE · Instagram / Meta Graph API utility (server-side only)
//
// Why this exists:
// - Single source of truth for Graph API calls (token validation,
//   container creation/polling, publish, error normalization)
// - Used by /api/instagram/[action]/route.ts (validate + publish-*)
// - NEVER import this from a client component — it reads server env
//   (INSTAGRAM_APP_ID / META_APP_ID / INSTAGRAM_ACCESS_TOKEN)
//
// Notes:
// - Dev-mode safe: while the Meta app is still in Development mode,
//   only the connected tester's IG business account can publish. The
//   utility falls back to the INSTAGRAM_ACCESS_TOKEN env when no user
//   token is supplied — useful for local testing without OAuth.
// - No webhooks, no Live-mode-only features here.
// =====================================================================

export const GRAPH = 'https://graph.facebook.com/v20.0'
export const IG_GRAPH = 'https://graph.instagram.com'

export interface MetaCreds {
  appId: string
  appSecret: string
  envAccessToken: string | null
}

/** Read Meta credentials from env. Supports INSTAGRAM_* and META_* names. */
export function getMetaCreds(): MetaCreds {
  return {
    appId:        process.env.INSTAGRAM_APP_ID     || process.env.META_APP_ID     || '',
    appSecret:    process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || '',
    envAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || null,
  }
}

export function metaCredsReady(): boolean {
  const c = getMetaCreds()
  return Boolean(c.appId && c.appSecret)
}

// =====================================================================
// ERROR HANDLING — Meta Graph error normalization
// =====================================================================

export interface MetaApiError {
  message: string
  type?: string
  code?: number
  subcode?: number
  is_token_expired: boolean
  is_permission: boolean
  raw?: any
}

/**
 * Token-expiry detection — Meta OAuthException subcodes:
 *  - 463 → access token expired
 *  - 467 → access token invalid (revoked / changed password)
 *  - 190 → general access token problem
 *  - code 100 + "session" string in some flows
 */
export function normalizeMetaError(json: any, fallback = 'Instagram API error'): MetaApiError {
  const e = json?.error || {}
  const code = Number(e.code)
  const subcode = Number(e.error_subcode || e.subcode)
  const message: string = String(e.message || fallback)
  const type: string = String(e.type || '')

  const isExpired =
    subcode === 463 ||
    subcode === 467 ||
    code === 190 ||
    /access token/i.test(message) && /(expired|invalid|revoked|session)/i.test(message)

  const isPermission =
    type === 'OAuthException' ||
    /permission|scope|insufficient/i.test(message)

  return {
    message,
    type,
    code: Number.isFinite(code) ? code : undefined,
    subcode: Number.isFinite(subcode) ? subcode : undefined,
    is_token_expired: Boolean(isExpired),
    is_permission: Boolean(isPermission),
    raw: e,
  }
}

/** Helper: throw a typed Error with .meta attached for downstream callers. */
export class IGPublishError extends Error {
  meta: MetaApiError
  constructor(meta: MetaApiError) {
    super(meta.message)
    this.name = 'IGPublishError'
    this.meta = meta
  }
}

// =====================================================================
// LOW-LEVEL CALLS
// =====================================================================

async function igGet(url: string): Promise<any> {
  const res = await fetch(url, { method: 'GET' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new IGPublishError(normalizeMetaError(json, `GET ${res.status}`))
  return json
}

async function igPost(url: string, body: URLSearchParams): Promise<any> {
  const res = await fetch(url, { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new IGPublishError(normalizeMetaError(json, `POST ${res.status}`))
  return json
}

// =====================================================================
// TOKEN VALIDATION
// =====================================================================

export interface TokenValidationResult {
  valid: boolean
  user_id?: string
  username?: string
  scopes?: string[]
  expires_at?: string | null
  error?: MetaApiError
}

/**
 * Validate a Meta/IG access token by calling /me and (best-effort)
 * /debug_token. Returns a normalized shape; never throws.
 */
export async function validateToken(token: string): Promise<TokenValidationResult> {
  if (!token) return { valid: false, error: { message: 'Empty token', is_token_expired: false, is_permission: false } }

  try {
    // 1) /me — confirms the token is live and we can read identity
    const me = await igGet(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(token)}`)

    // 2) /debug_token — gives expiry + scopes (requires app token: APPID|APPSECRET)
    const c = getMetaCreds()
    let expires_at: string | null = null
    let scopes: string[] | undefined
    if (c.appId && c.appSecret) {
      try {
        const dbg = await igGet(
          `${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${c.appId}|${c.appSecret}`)}`
        )
        const data = dbg?.data || {}
        if (data.expires_at && Number(data.expires_at) > 0) {
          expires_at = new Date(Number(data.expires_at) * 1000).toISOString()
        }
        if (Array.isArray(data.scopes)) scopes = data.scopes
      } catch {
        // debug_token is best-effort — token is still considered valid if /me succeeded
      }
    }

    return {
      valid: true,
      user_id: me?.id,
      username: me?.name,
      scopes,
      expires_at,
    }
  } catch (e: any) {
    const meta: MetaApiError = e?.meta || { message: e?.message || 'Validation failed', is_token_expired: false, is_permission: false }
    return { valid: false, error: meta }
  }
}

// =====================================================================
// MEDIA CONTAINER LIFECYCLE
// =====================================================================

interface ContainerCreateInput {
  image_url?: string
  video_url?: string
  caption?: string
  media_type?: 'REELS' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  is_carousel_item?: boolean
  children?: string  // comma-separated child container IDs (for carousel parent)
  share_to_feed?: boolean
}

/** POST /{ig-user-id}/media — returns { id: containerId } */
export async function createContainer(igUserId: string, token: string, input: ContainerCreateInput): Promise<string> {
  const params = new URLSearchParams()
  if (input.image_url) params.set('image_url', input.image_url)
  if (input.video_url) params.set('video_url', input.video_url)
  if (input.caption)   params.set('caption', input.caption)
  if (input.media_type) params.set('media_type', input.media_type)
  if (input.is_carousel_item) params.set('is_carousel_item', 'true')
  if (input.children) params.set('children', input.children)
  if (typeof input.share_to_feed === 'boolean') params.set('share_to_feed', String(input.share_to_feed))
  params.set('access_token', token)

  const json = await igPost(`${GRAPH}/${igUserId}/media`, params)
  if (!json?.id) throw new IGPublishError({ message: 'Container had no id', is_token_expired: false, is_permission: false, raw: json })
  return json.id as string
}

/** Poll the container until it reports FINISHED or hits the timeout. */
export async function pollContainerUntilReady(
  containerId: string,
  token: string,
  opts: { attempts?: number; intervalMs?: number } = {},
): Promise<void> {
  const attempts = opts.attempts ?? 20    // up to 20 * 3s = 60s for reels
  const intervalMs = opts.intervalMs ?? 3000

  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    let json: any
    try {
      json = await igGet(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`)
    } catch (e: any) {
      // transient errors — keep polling unless it's an auth issue
      if (e?.meta?.is_token_expired) throw e
      continue
    }
    const code = String(json?.status_code || '').toUpperCase()
    if (code === 'FINISHED') return
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new IGPublishError({ message: `Container ${code}: ${json?.status || 'unknown'}`, is_token_expired: false, is_permission: false, raw: json })
    }
  }
  throw new IGPublishError({ message: 'Container did not become ready in time', is_token_expired: false, is_permission: false })
}

/** POST /{ig-user-id}/media_publish — returns { id: mediaId } */
export async function publishContainer(igUserId: string, containerId: string, token: string): Promise<string> {
  const params = new URLSearchParams()
  params.set('creation_id', containerId)
  params.set('access_token', token)
  const json = await igPost(`${GRAPH}/${igUserId}/media_publish`, params)
  if (!json?.id) throw new IGPublishError({ message: 'Publish returned no id', is_token_expired: false, is_permission: false, raw: json })
  return json.id as string
}

/** Best-effort permalink fetch — never throws. */
export async function getPermalink(mediaId: string, token: string): Promise<string | null> {
  try {
    const json = await igGet(`${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`)
    return json?.permalink || null
  } catch { return null }
}

// =====================================================================
// HIGH-LEVEL PUBLISH HELPERS
// =====================================================================

export interface PublishResult {
  ok: true
  media_id: string
  container_id: string
  permalink: string | null
}

/** Publish a single image (feed post). */
export async function publishImage(igUserId: string, imageUrl: string, caption: string, token: string): Promise<PublishResult> {
  const containerId = await createContainer(igUserId, token, { image_url: imageUrl, caption })
  // Image containers are usually ready instantly; no poll needed for static images.
  const mediaId = await publishContainer(igUserId, containerId, token)
  const permalink = await getPermalink(mediaId, token)
  return { ok: true, media_id: mediaId, container_id: containerId, permalink }
}

/** Publish a Reel (video). Polls container until FINISHED before publishing. */
export async function publishReel(
  igUserId: string,
  videoUrl: string,
  caption: string,
  token: string,
  opts: { share_to_feed?: boolean } = {},
): Promise<PublishResult> {
  const containerId = await createContainer(igUserId, token, {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: opts.share_to_feed ?? true,
  })
  await pollContainerUntilReady(containerId, token, { attempts: 20, intervalMs: 3000 })
  const mediaId = await publishContainer(igUserId, containerId, token)
  const permalink = await getPermalink(mediaId, token)
  return { ok: true, media_id: mediaId, container_id: containerId, permalink }
}

/**
 * Publish a carousel (2–10 items). Accepts a mix of image and video URLs.
 * Each child container is created with is_carousel_item=true, then a parent
 * CAROUSEL container groups them, then we publish the parent.
 */
export async function publishCarousel(
  igUserId: string,
  mediaUrls: string[],
  caption: string,
  token: string,
): Promise<PublishResult> {
  if (!Array.isArray(mediaUrls) || mediaUrls.length < 2 || mediaUrls.length > 10) {
    throw new IGPublishError({ message: 'Carousel needs 2–10 media URLs', is_token_expired: false, is_permission: false })
  }

  const isVideo = (u: string) => /\.(mp4|mov|m4v)(\?|$)/i.test(u)

  // 1) Create child containers in parallel
  const childIds = await Promise.all(
    mediaUrls.map(url =>
      createContainer(igUserId, token, isVideo(url)
        ? { video_url: url, media_type: 'VIDEO', is_carousel_item: true }
        : { image_url: url, is_carousel_item: true }
      )
    )
  )

  // 2) For any video children, wait until they're FINISHED
  const videoChildren = childIds.filter((_, i) => isVideo(mediaUrls[i]))
  for (const cid of videoChildren) {
    await pollContainerUntilReady(cid, token, { attempts: 15, intervalMs: 3000 })
  }

  // 3) Create the parent carousel container
  const parentId = await createContainer(igUserId, token, {
    media_type: 'CAROUSEL',
    caption,
    children: childIds.join(','),
  })

  // 4) Publish parent
  const mediaId = await publishContainer(igUserId, parentId, token)
  const permalink = await getPermalink(mediaId, token)
  return { ok: true, media_id: mediaId, container_id: parentId, permalink }
}
