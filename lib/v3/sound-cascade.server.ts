import 'server-only'

import { logError } from '@/lib/workspace/validation'

export type V7SoundEffect = {
  name: string
  url: string
  startSec?: number
}

export type SoundCascadeResult = {
  sfx: V7SoundEffect[]
  provider: 'pollinations' | 'audiogen' | 'none'
}

function inferSceneAmbience(scene: { location?: string; action?: string }): string[] {
  const text = `${scene.location ?? ''} ${scene.action ?? ''}`.toLowerCase()
  const cues: string[] = []

  if (/rain|monsoon|storm|wet/.test(text)) cues.push('rain ambience', 'thunder distant')
  if (/wind|breeze|storm/.test(text)) cues.push('wind through trees')
  if (/restaurant|dining|kitchen|cafe|table/.test(text)) cues.push('restaurant ambience', 'kitchen sizzle')
  if (/crowd|street|city|market/.test(text)) cues.push('crowd murmur', 'urban ambience')
  if (/door|entrance|exit/.test(text)) cues.push('door open close')
  if (/footstep|walk|run/.test(text)) cues.push('footsteps on floor')
  if (/impact|crash|slam/.test(text)) cues.push('cinematic impact')

  if (cues.length === 0) cues.push('subtle cinematic room tone')
  return cues.slice(0, 3)
}

async function synthesizePollinationsSfx(prompt: string): Promise<string | null> {
  try {
    const { readPollinationsApiKeyFromEnv } = await import('@/lib/pollinations/key-diagnostics-core')
    if (!readPollinationsApiKeyFromEnv()) return null
    const { fetchPollinationsSfxBuffer } = await import('@/lib/pollinations/audio.server')
    const result = await fetchPollinationsSfxBuffer({ prompt })
    if (!result) return null
    return `data:audio/mpeg;base64,${result.buffer.toString('base64')}`
  } catch (err) {
    logError('sound-cascade.pollinations', err)
    return null
  }
}

async function synthesizeAudioGenClip(prompt: string): Promise<string | null> {
  const endpoint = process.env.AUDIOGEN_URL?.trim()
  if (!endpoint || !prompt.trim()) return null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.slice(0, 500), duration: 4 }),
      signal: AbortSignal.timeout(90_000),
    })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const json = (await res.json()) as { url?: string; audioUrl?: string; audio?: string }
      return json.url?.trim() || json.audioUrl?.trim() || json.audio?.trim() || null
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 256) return null
    const mime = contentType.split(';')[0]?.trim() || 'audio/mpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch (err) {
    logError('sound-cascade.audiogen', err)
    return null
  }
}

/** Pollinations SFX → AudioGen (local OSS) → scene-mapped SFX list. Never throws or blocks the pipeline. */
export async function generateV7SoundEffects(params?: {
  scenes?: Array<{ location?: string; action?: string; sceneNumber?: number }>
}): Promise<SoundCascadeResult> {
  const scenes = params?.scenes ?? []
  const sfx: V7SoundEffect[] = []
  let usedPollinations = false
  let usedAudiogen = false

  if (scenes.length > 0) {
    for (const scene of scenes) {
      const prompts = inferSceneAmbience(scene).slice(0, 2)
      for (const prompt of prompts) {
        const pollinationsUrl = await synthesizePollinationsSfx(prompt)
        if (pollinationsUrl) {
          usedPollinations = true
          sfx.push({
            name: prompt,
            url: pollinationsUrl,
            startSec: scene.sceneNumber ? Math.max(0, (scene.sceneNumber - 1) * 4) : sfx.length * 4,
          })
          continue
        }
        const url = await synthesizeAudioGenClip(prompt)
        if (url) {
          usedAudiogen = true
          sfx.push({
            name: prompt,
            url,
            startSec: scene.sceneNumber ? Math.max(0, (scene.sceneNumber - 1) * 4) : sfx.length * 4,
          })
        }
      }
    }
  } else {
    const prompts = ['cinematic foley transition']
    for (const prompt of prompts) {
      const pollinationsUrl = await synthesizePollinationsSfx(prompt)
      if (pollinationsUrl) {
        usedPollinations = true
        sfx.push({ name: prompt, url: pollinationsUrl })
        continue
      }
      const url = await synthesizeAudioGenClip(prompt)
      if (url) {
        usedAudiogen = true
        sfx.push({ name: prompt, url })
      }
    }
  }

  const provider: SoundCascadeResult['provider'] =
    sfx.length === 0 ? 'none' : usedPollinations ? 'pollinations' : usedAudiogen ? 'audiogen' : 'none'

  return { sfx, provider }
}
