import type { ContentPiece, Platform } from '@/lib/types'
import { getBufferConfig } from './env'

const BASE = 'https://api.bufferapp.com/1'

export class BufferApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'BufferApiError'
    this.status = status
    this.body = body
  }
}

export type BufferProfile = {
  id: string
  service: string
  service_username?: string
  formatted_username?: string
  avatar?: string
  default?: boolean
}

async function bufferFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('access_token', accessToken)
  const res = await fetch(url.toString(), init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (body as { message?: string; error?: string })?.message ||
      (body as { error?: string })?.error ||
      `Buffer API error (${res.status})`
    throw new BufferApiError(msg, res.status, body)
  }
  return body as T
}

export async function validateBufferConnection(): Promise<{
  ok: boolean
  user?: string
  profiles?: BufferProfile[]
  error?: string
}> {
  const { accessToken, configured } = getBufferConfig()
  if (!configured || !accessToken) {
    return { ok: false, error: 'not_configured' }
  }
  try {
    const userRes = await bufferFetch<{ name?: string; email?: string }>(
      accessToken,
      '/user.json'
    )
    const profilesRes = await bufferFetch<BufferProfile[]>(
      accessToken,
      '/profiles.json'
    )
    return {
      ok: true,
      user: userRes.name || userRes.email,
      profiles: profilesRes || [],
    }
  } catch (e: unknown) {
    const msg = e instanceof BufferApiError ? e.message : 'Connection failed'
    return { ok: false, error: msg }
  }
}

const PLATFORM_SERVICE: Partial<Record<Platform, string>> = {
  twitter: 'twitter',
  linkedin: 'linkedin',
  facebook: 'facebook',
  instagram: 'instagram',
}

export function pickBufferProfile(
  profiles: BufferProfile[],
  platform: Platform,
  preferredId?: string
): BufferProfile | null {
  if (!profiles.length) return null
  if (preferredId) {
    const match = profiles.find((p) => p.id === preferredId)
    if (match) return match
  }
  const service = PLATFORM_SERVICE[platform]
  if (service) {
    const match = profiles.find((p) => p.service === service)
    if (match) return match
  }
  return profiles.find((p) => p.default) || profiles[0]
}

function buildPostText(item: ContentPiece): string {
  const parts = [item.title?.trim(), item.description?.trim()].filter(Boolean)
  return parts.join('\n\n').slice(0, 3000) || item.title || 'New post from Mugtee'
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

export async function queueContentToBuffer(params: {
  item: ContentPiece
  profileId?: string
  scheduledAt?: string | null
}): Promise<{ updateId: string; profileId: string }> {
  const { accessToken, defaultProfileId } = getBufferConfig()
  if (!accessToken) {
    throw new BufferApiError('Buffer is not configured', 503, {})
  }

  const status = await validateBufferConnection()
  if (!status.ok || !status.profiles?.length) {
    throw new BufferApiError(status.error || 'No Buffer profiles found', 502, {})
  }

  const profile = pickBufferProfile(
    status.profiles,
    params.item.platform,
    params.profileId || defaultProfileId
  )
  if (!profile) {
    throw new BufferApiError('No matching Buffer profile', 400, {})
  }

  const text = buildPostText(params.item)
  const body = new URLSearchParams()
  body.set('profile_ids[]', profile.id)
  body.set('text', text)

  const mediaUrl = params.item.media_url
  if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
    if (isVideoUrl(mediaUrl)) {
      body.set('media[video]', mediaUrl)
    } else {
      body.set('media[photo]', mediaUrl)
    }
  }

  if (params.scheduledAt || params.item.scheduled_at) {
    const when = new Date(params.scheduledAt || params.item.scheduled_at!)
    if (!isNaN(when.getTime()) && when.getTime() > Date.now()) {
      body.set('scheduled_at', String(Math.floor(when.getTime() / 1000)))
    }
  }

  const result = await bufferFetch<{ updates?: { id?: string }[]; id?: string }>(
    accessToken,
    '/updates/create.json',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  )

  const updateId = result.updates?.[0]?.id || result.id
  if (!updateId) {
    throw new BufferApiError('Buffer did not return an update id', 502, result)
  }

  return { updateId, profileId: profile.id }
}
