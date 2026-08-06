import 'server-only'

import { resolveMvpRoyaltyFreeMusicUrl } from '@/lib/v3/music.server'
import { logError } from '@/lib/workspace/validation'

export type MusicCascadeResult = {
  musicUrl: string | null
  provider: 'musicgen' | 'royalty_free' | 'none'
}

async function tryMusicGen(params: {
  emotion?: string
  durationSec?: number
  pacing?: string
}): Promise<string | null> {
  const endpoint = process.env.MUSICGEN_URL?.trim()
  if (!endpoint) return null

  const prompt =
    process.env.MUSICGEN_PROMPT?.trim() ||
    [
      'cinematic background music',
      params.emotion,
      params.pacing ? `${params.pacing} pacing` : null,
    ]
      .filter(Boolean)
      .join(', ')

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        duration: Math.max(8, Math.min(params.durationSec ?? 45, 120)),
      }),
      signal: AbortSignal.timeout(180_000),
    })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const json = (await res.json()) as { url?: string; audioUrl?: string; audio?: string }
      return json.url?.trim() || json.audioUrl?.trim() || json.audio?.trim() || null
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 512) return null
    const mime = contentType.split(';')[0]?.trim() || 'audio/mpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch (err) {
    logError('music-cascade.musicgen', err)
    return null
  }
}

/** MusicGen (local OSS) → royalty-free static URL. Never throws. */
export async function resolveV7MusicUrl(params?: {
  emotion?: string
  durationSec?: number
  pacing?: string
}): Promise<MusicCascadeResult> {
  const generated = await tryMusicGen(params ?? {})
  if (generated) {
    return { musicUrl: generated, provider: 'musicgen' }
  }

  const staticUrl = resolveMvpRoyaltyFreeMusicUrl()
  if (staticUrl) {
    return { musicUrl: staticUrl, provider: 'royalty_free' }
  }

  return { musicUrl: null, provider: 'none' }
}
