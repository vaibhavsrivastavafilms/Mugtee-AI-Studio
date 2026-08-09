import 'server-only'

import { PollinationsError } from '@/lib/pollinations/errors.server'
import { GEN_POLLINATIONS_BASE, pollinationsAuthHeaders, readPollinationsApiKey } from '@/lib/pollinations/models.server'

const MEDIA_UPLOAD_BASE = 'https://media.pollinations.ai/upload'

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

export function isLocalOrPrivateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim())
    if (BLOCKED_HOSTS.has(parsed.hostname.toLowerCase())) return true
    if (/^10\./.test(parsed.hostname)) return true
    if (/^192\.168\./.test(parsed.hostname)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname)) return true
    return false
  } catch {
    return true
  }
}

export function isHttpsPublicImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'https:' && !isLocalOrPrivateImageUrl(url)
  } catch {
    return false
  }
}

async function probeImageUrlReachable(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-1023' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok && res.status !== 206) {
    throw new PollinationsError({
      code: 'POLLINATIONS_IMAGE_URL_INVALID',
      message: `Storyboard image not reachable by Pollinations (HTTP ${res.status})`,
      httpStatus: res.status,
      action: 'Ensure storyboard images are persisted to public Supabase storage before animation.',
    })
  }
}

async function uploadDataUrlToPollinationsMedia(dataUrl: string): Promise<string> {
  const key = readPollinationsApiKey()
  if (!key) {
    throw new PollinationsError({
      code: 'POLLINATIONS_AUTH_FAILED',
      message: 'Cannot upload storyboard image without POLLINATIONS_API_KEY',
      action: 'Set POLLINATIONS_API_KEY from https://enter.pollinations.ai/keys',
    })
  }

  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim())
  if (!match) {
    throw new PollinationsError({
      code: 'POLLINATIONS_IMAGE_URL_INVALID',
      message: 'Storyboard image must be a public HTTPS URL or valid data URL for upload',
    })
  }

  const res = await fetch(MEDIA_UPLOAD_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: dataUrl.trim(),
      contentType: match[1],
      name: 'storyboard-scene.png',
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    throw new PollinationsError({
      code: res.status === 401 || res.status === 403 ? 'POLLINATIONS_AUTH_FAILED' : 'POLLINATIONS_IMAGE_URL_INVALID',
      message: `Failed to upload storyboard image for Pollinations (HTTP ${res.status})`,
      httpStatus: res.status,
    })
  }

  const body = (await res.json()) as { url?: string; id?: string }
  const mediaUrl = body.url ?? (body.id ? `https://media.pollinations.ai/${body.id}` : '')
  if (!mediaUrl.startsWith('https://')) {
    throw new PollinationsError({
      code: 'POLLINATIONS_IMAGE_URL_INVALID',
      message: 'Pollinations media upload did not return a public URL',
    })
  }

  return mediaUrl
}

/**
 * Returns an HTTPS URL Pollinations can fetch for image-to-video.
 * Rejects localhost/private URLs. Uploads data URLs via media.pollinations.ai when needed.
 */
export async function resolvePollinationsVideoImageUrl(params: {
  imageUrl: string
  sceneNumber?: number
}): Promise<string> {
  const raw = params.imageUrl?.trim()
  if (!raw) {
    throw new PollinationsError({
      code: 'POLLINATIONS_IMAGE_URL_INVALID',
      message: 'Storyboard image URL is missing',
      sceneNumber: params.sceneNumber,
    })
  }

  if (raw.startsWith('data:')) {
    const uploaded = await uploadDataUrlToPollinationsMedia(raw)
    console.info('[pollinations] storyboard image uploaded for video', {
      scene: params.sceneNumber ?? null,
      domain: new URL(uploaded).hostname,
    })
    return uploaded
  }

  if (isLocalOrPrivateImageUrl(raw)) {
    throw new PollinationsError({
      code: 'POLLINATIONS_IMAGE_URL_INVALID',
      message:
        'Storyboard image URL is not publicly accessible (localhost/private). Persist images to Supabase storage before animation.',
      sceneNumber: params.sceneNumber,
      action: 'Re-run image stage so assets are stored with a public HTTPS URL.',
    })
  }

  if (!isHttpsPublicImageUrl(raw)) {
    throw new PollinationsError({
      code: 'POLLINATIONS_IMAGE_URL_INVALID',
      message: 'Storyboard image must use a public HTTPS URL for Pollinations image-to-video',
      sceneNumber: params.sceneNumber,
    })
  }

  await probeImageUrlReachable(raw)
  return raw
}

export function capPollinationsVideoDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  const maxLong = 1280
  const maxShort = 720
  const long = Math.max(width, height)
  const short = Math.min(width, height)
  if (long <= maxLong && short <= maxShort) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const scale = Math.min(maxLong / long, maxShort / short)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
