import 'server-only'

import { resolvePollinationsAuthContext } from '@/lib/pollinations/auth-context.server'
import { PollinationsError } from '@/lib/pollinations/errors.server'
import { classifyPollinationsHttpError } from '@/lib/pollinations/error-classification-core'
import {
  GEN_POLLINATIONS_BASE,
  pollinationsAuthHeaders,
  selectPollinationsMusicModel,
  selectPollinationsSfxModel,
  selectPollinationsTtsModel,
} from '@/lib/pollinations/models.server'

const DEFAULT_VOICE = process.env.POLLINATIONS_TTS_VOICE?.trim() || 'nova'

async function resolveAuth(userId?: string) {
  return resolvePollinationsAuthContext({ userId })
}

function mapAudioHttpError(res: Response, bodyText: string, model: string): PollinationsError {
  const classified = classifyPollinationsHttpError({
    httpStatus: res.status,
    capability: 'audio',
    model,
    bodyText,
  })
  return new PollinationsError({
    code: classified.code as PollinationsError['code'],
    message: classified.message,
    httpStatus: res.status,
    model,
    responseBody: bodyText.slice(0, 500),
    retryable: classified.retryable,
  })
}

export async function fetchPollinationsSpeechBuffer(params: {
  text: string
  voice?: string
  model?: string
  userId?: string
  timeoutMs?: number
}): Promise<{ buffer: Buffer; model: string; voice: string }> {
  const narration = params.text.trim().slice(0, 4000)
  if (!narration) {
    throw new PollinationsError({
      code: 'POLLINATIONS_INPUT_REJECTED',
      message: 'Pollinations TTS requires non-empty text',
      retryable: false,
    })
  }

  const auth = await resolveAuth(params.userId)
  const model =
    params.model?.trim() ||
    (await selectPollinationsTtsModel().catch(() => process.env.POLLINATIONS_TTS_MODEL?.trim() || 'elevenlabs'))
  const voice = params.voice?.trim() || DEFAULT_VOICE

  const res = await fetch(`${GEN_POLLINATIONS_BASE}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/*',
      ...pollinationsAuthHeaders(auth.apiKey),
    },
    body: JSON.stringify({
      model,
      input: narration,
      voice,
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(params.timeoutMs ?? 120_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw mapAudioHttpError(res, body, model)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 256) {
    throw new PollinationsError({
      code: 'POLLINATIONS_GENERATION_FAILED',
      message: 'Pollinations TTS returned empty audio',
      model,
      retryable: true,
    })
  }

  return { buffer, model, voice }
}

export async function fetchPollinationsMusicBuffer(params: {
  prompt: string
  durationSec?: number
  userId?: string
}): Promise<{ buffer: Buffer; model: string } | null> {
  const prompt = params.prompt.trim().slice(0, 500)
  if (!prompt) return null

  try {
    const auth = await resolveAuth(params.userId)
    const model = await selectPollinationsMusicModel()
    const duration = Math.max(8, Math.min(params.durationSec ?? 45, 120))
    const url = new URL(`${GEN_POLLINATIONS_BASE}/audio/${encodeURIComponent(prompt)}`)
    url.searchParams.set('model', model)
    url.searchParams.set('duration', String(duration))
    url.searchParams.set('response_format', 'mp3')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'audio/*', ...pollinationsAuthHeaders(auth.apiKey) },
      signal: AbortSignal.timeout(180_000),
    })

    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 512) return null
    return { buffer, model }
  } catch {
    return null
  }
}

export async function fetchPollinationsSfxBuffer(params: {
  prompt: string
  userId?: string
}): Promise<{ buffer: Buffer; model: string } | null> {
  const prompt = params.prompt.trim().slice(0, 500)
  if (!prompt) return null

  try {
    const auth = await resolveAuth(params.userId)
    const model = await selectPollinationsSfxModel()
    const url = new URL(`${GEN_POLLINATIONS_BASE}/audio/${encodeURIComponent(prompt)}`)
    url.searchParams.set('model', model)
    url.searchParams.set('response_format', 'mp3')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'audio/*', ...pollinationsAuthHeaders(auth.apiKey) },
      signal: AbortSignal.timeout(90_000),
    })

    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 256) return null
    return { buffer, model }
  } catch {
    return null
  }
}

export async function probePollinationsAudioReady(): Promise<{
  ready: boolean
  authenticated: boolean
  model: string | null
}> {
  const { probePollinationsAuthenticationStatus } = await import(
    '@/lib/pollinations/key-diagnostics.server'
  )
  const auth = await probePollinationsAuthenticationStatus()
  if (!auth.authenticated) {
    return { ready: false, authenticated: false, model: null }
  }
  let model: string | null = null
  try {
    model = await selectPollinationsTtsModel()
  } catch {
    model = process.env.POLLINATIONS_TTS_MODEL?.trim() || 'elevenlabs'
  }
  return { ready: Boolean(model), authenticated: true, model }
}
