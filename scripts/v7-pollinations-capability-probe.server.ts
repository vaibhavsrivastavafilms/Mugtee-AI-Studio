/**
 * Pollinations unified capability probe — production-realistic checks only.
 *
 * Usage:
 *   npx tsx scripts/v7-pollinations-capability-probe.server.ts
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

type ProbeResult = {
  text: { pass: boolean; model: string | null; httpStatus: number | null; reason: string | null }
  image: { pass: boolean; model: string | null; bytes: number | null; httpStatus: number | null }
  tts: { pass: boolean; bytes: number | null; reason: string | null }
  music: { pass: boolean; bytes: number | null; reason: string | null }
  sfx: { pass: boolean; bytes: number | null; reason: string | null }
  video: { pass: boolean; model: string | null; bytes: number | null; reason: string | null }
}

async function probeText(): Promise<ProbeResult['text']> {
  const { fetchPollinationsChatCompletion } = await import('../lib/pollinations/text.server')
  try {
    const result = await fetchPollinationsChatCompletion({
      messages: [
        {
          role: 'user',
          content:
            'Write two sentences about five ancient civilizations that disappeared. Return plain text only.',
        },
      ],
      maxTokens: 128,
      timeoutMs: 60_000,
    })
    const text = result.text.trim()
    const pass = text.length >= 40 && !/^Safety:/i.test(text)
    return {
      pass,
      model: result.model,
      httpStatus: 200,
      reason: pass ? null : 'Response too short or safety-only classifier output',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusMatch = /\bHTTP\s+(\d{3})\b/i.exec(message)
    return {
      pass: false,
      model: null,
      httpStatus: statusMatch ? Number(statusMatch[1]) : null,
      reason: message.slice(0, 240),
    }
  }
}

async function probeImage(): Promise<ProbeResult['image']> {
  const { GEN_POLLINATIONS_BASE, pollinationsAuthHeaders, selectBestPollinationsModel } = await import(
    '../lib/pollinations/models.server'
  )
  try {
    const model = await selectBestPollinationsModel('image')
    const prompt = 'minimal health check plate on dark table, photorealistic, no text'
    const url = new URL(`${GEN_POLLINATIONS_BASE}/image/${encodeURIComponent(prompt)}`)
    url.searchParams.set('model', model)
    url.searchParams.set('width', '512')
    url.searchParams.set('height', '512')
    url.searchParams.set('seed', '424242')
    const res = await fetch(url.toString(), {
      headers: { Accept: 'image/*', ...pollinationsAuthHeaders() },
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) {
      return { pass: false, model, bytes: null, httpStatus: res.status }
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    return {
      pass: buffer.length >= 512,
      model,
      bytes: buffer.length,
      httpStatus: res.status,
    }
  } catch {
    return { pass: false, model: null, bytes: null, httpStatus: null }
  }
}

async function probeTts(): Promise<ProbeResult['tts']> {
  const { fetchPollinationsSpeechBuffer } = await import('../lib/pollinations/audio.server')
  try {
    const result = await fetchPollinationsSpeechBuffer({
      text: 'Ancient civilizations vanished without explanation.',
    })
    return {
      pass: result.buffer.length >= 512,
      bytes: result.buffer.length,
      reason: null,
    }
  } catch (err) {
    return {
      pass: false,
      bytes: null,
      reason: err instanceof Error ? err.message.slice(0, 240) : String(err),
    }
  }
}

async function probeMusic(): Promise<ProbeResult['music']> {
  const { fetchPollinationsMusicBuffer } = await import('../lib/pollinations/audio.server')
  try {
    const result = await fetchPollinationsMusicBuffer({
      prompt: 'cinematic documentary background music, mysterious ancient ruins',
      durationSec: 12,
    })
    if (!result) return { pass: false, bytes: null, reason: 'No music buffer returned' }
    return { pass: result.buffer.length >= 512, bytes: result.buffer.length, reason: null }
  } catch (err) {
    return {
      pass: false,
      bytes: null,
      reason: err instanceof Error ? err.message.slice(0, 240) : String(err),
    }
  }
}

async function probeSfx(): Promise<ProbeResult['sfx']> {
  const { fetchPollinationsSfxBuffer } = await import('../lib/pollinations/audio.server')
  try {
    const result = await fetchPollinationsSfxBuffer({ prompt: 'rain ambience distant thunder' })
    if (!result) return { pass: false, bytes: null, reason: 'No SFX buffer returned' }
    return { pass: result.buffer.length >= 256, bytes: result.buffer.length, reason: null }
  } catch (err) {
    return {
      pass: false,
      bytes: null,
      reason: err instanceof Error ? err.message.slice(0, 240) : String(err),
    }
  }
}

async function probeVideo(): Promise<ProbeResult['video']> {
  const { evaluatePollinationsVideoEntitlement } = await import('../lib/pollinations/entitlement.server')
  const { fetchPollinationsVideoBuffer } = await import('../lib/pollinations/client.server')
  const { GEN_POLLINATIONS_BASE, appendPollinationsAuth, selectBestPollinationsModel } = await import(
    '../lib/pollinations/models.server'
  )

  const entitlement = await evaluatePollinationsVideoEntitlement({
    durationSec: 5,
    probeSpendable: true,
    forceRefresh: true,
    width: 720,
    height: 1280,
  })
  if (!entitlement.entitled || !entitlement.affordable || !entitlement.model) {
    return {
      pass: false,
      model: entitlement.model,
      bytes: null,
      reason: entitlement.reason ?? entitlement.code ?? 'VIDEO_NOT_ENTITLED',
    }
  }

  try {
    const imageModel = await selectBestPollinationsModel('image')
    const prompt = 'minimal health check plate on dark table, photorealistic, no text'
    const imageUrl = appendPollinationsAuth(
      new URL(`${GEN_POLLINATIONS_BASE}/image/${encodeURIComponent(prompt)}`)
    )
    imageUrl.searchParams.set('model', imageModel)
    imageUrl.searchParams.set('width', '512')
    imageUrl.searchParams.set('height', '512')
    imageUrl.searchParams.set('seed', '424242')

    const video = await fetchPollinationsVideoBuffer({
      prompt: 'slow cinematic camera push on the scene, subtle natural motion',
      imageUrl: imageUrl.toString(),
      durationSec: 5,
      width: 720,
      height: 1280,
      model: entitlement.model,
      sceneNumber: 1,
    })

    const pass = video.buffer.length >= 4096
    return {
      pass,
      model: video.model,
      bytes: video.buffer.length,
      reason: pass ? null : 'Video buffer too small',
    }
  } catch (err) {
    return {
      pass: false,
      model: entitlement.model,
      bytes: null,
      reason: err instanceof Error ? err.message.slice(0, 240) : String(err),
    }
  }
}

async function main() {
  const { inspectPollinationsKeyConfig } = await import('../lib/pollinations/key-diagnostics.server')
  const key = inspectPollinationsKeyConfig()
  console.info('[pollinations-capability] key', {
    present: key.present,
    prefix: key.prefix,
    validFormat: key.validFormat,
  })

  const result: ProbeResult = {
    text: await probeText(),
    image: await probeImage(),
    tts: await probeTts(),
    music: await probeMusic(),
    sfx: await probeSfx(),
    video: await probeVideo(),
  }

  console.log('\n[POLLINATIONS CAPABILITY PROBE]')
  console.log(JSON.stringify(result, null, 2))
  console.log('CAPABILITY_JSON:' + JSON.stringify(result))

  const deployReady =
    result.text.pass &&
    result.image.pass &&
    result.tts.pass &&
    result.music.pass &&
    result.sfx.pass &&
    result.video.pass
  process.exit(deployReady ? 0 : 1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
