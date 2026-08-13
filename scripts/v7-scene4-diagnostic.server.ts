/**
 * READ-ONLY diagnostic for Scene 4 — does NOT call POST /video, /image, or /audio.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
config({ path: resolve(process.cwd(), '.env.local') })

function probeImageDimensions(buf: Buffer): { width?: number; height?: number; format?: string } {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return {
      format: 'png',
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    }
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) break
      const marker = buf[offset + 1]
      const len = buf.readUInt16BE(offset + 2)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
        return {
          format: 'jpeg',
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7),
        }
      }
      offset += 2 + len
    }
  }
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { format: 'webp' }
  }
  return {}
}

const PRODUCTION_ID = '830f403a-6bf6-42db-b096-8474e51d7af3'
const SCENE_NUMBER = 4

async function validateImageUrl(url: string) {
  const result: Record<string, unknown> = {
    url: url.slice(0, 120) + (url.length > 120 ? '…' : ''),
    isHttps: url.startsWith('https://'),
  }
  try {
    const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) })
    result.headStatus = head.status
    result.contentType = head.headers.get('content-type')
    result.contentLength = head.headers.get('content-length')
  } catch (e) {
    result.headError = e instanceof Error ? e.message : String(e)
  }

  try {
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-65535' },
      signal: AbortSignal.timeout(20_000),
    })
    result.getStatus = res.status
    result.getContentType = res.headers.get('content-type')
    const buf = Buffer.from(await res.arrayBuffer())
    result.bytesFetched = buf.length
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('image') && buf.length > 0) {
      const meta = probeImageDimensions(buf)
      result.width = meta.width
      result.height = meta.height
      result.format = meta.format
      result.decodable = Boolean(meta.width && meta.height)
    } else if (buf.slice(0, 20).toString('utf8').trimStart().startsWith('<')) {
      result.htmlResponse = true
    } else if (buf.slice(0, 1).toString() === '{') {
      result.jsonResponse = true
    }
  } catch (e) {
    result.getError = e instanceof Error ? e.message : String(e)
  }

  return result
}

async function fetchBalance(): Promise<number | null> {
  const key = process.env.POLLINATIONS_API_KEY?.trim()
  if (!key) return null
  try {
    const res = await fetch('https://gen.pollinations.ai/account/balance', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { balance?: number; pollen?: number }
    return body.balance ?? body.pollen ?? null
  } catch {
    return null
  }
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: production } = await s
    .from('v7_productions')
    .select('status,current_stage,title,user_id,prompt,creative_brief')
    .eq('id', PRODUCTION_ID)
    .single()

  const { data: stages } = await s.from('v7_stages').select('*').eq('production_id', PRODUCTION_ID)
  const { data: scene4 } = await s
    .from('v7_scenes')
    .select('*')
    .eq('production_id', PRODUCTION_ID)
    .eq('number', SCENE_NUMBER)
    .single()

  const storyboard = (scene4?.storyboard ?? {}) as Record<string, unknown>
  const script = (scene4?.script ?? {}) as Record<string, unknown>
  const imageUrl = String(storyboard.imageUrl ?? storyboard.image_url ?? '')
  const videoPrompt = String(storyboard.videoPrompt ?? storyboard.prompt ?? script.prompt ?? '')
  const animatingStage = stages?.find((st) => st.stage === 'animating')

  const imageValidation = imageUrl ? await validateImageUrl(imageUrl) : { missing: true }
  const balance = await fetchBalance()

  const forbidden = ['CHEF', 'KITCHEN', 'COOKING', 'CHEF HANDS', 'FOOD PREPARATION']
  const required = ['COUPLE', 'GLASSES', 'DINING ROOM']
  const promptUpper = videoPrompt.toUpperCase()

  console.log(
    JSON.stringify(
      {
        production: {
          id: PRODUCTION_ID,
          status: production?.status,
          current_stage: production?.current_stage,
          title: production?.title,
        },
        animatingStage: animatingStage
          ? {
              status: animatingStage.status,
              error: animatingStage.error,
              output: animatingStage.output,
              input: animatingStage.input,
            }
          : null,
        scene4: {
          number: scene4?.number,
          duration: scene4?.duration,
          imageUrl: imageUrl.slice(0, 200),
          videoUrl: storyboard.videoUrl ?? null,
          width: storyboard.width,
          height: storyboard.height,
          aspectRatio: storyboard.aspectRatio,
          videoPrompt,
          script,
          storyboardKeys: Object.keys(storyboard),
        },
        promptValidation: {
          requiredPresent: required.map((w) => ({ word: w, present: promptUpper.includes(w) })),
          forbiddenPresent: forbidden.map((w) => ({ word: w, present: promptUpper.includes(w) })),
        },
        imageValidation,
        balance,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
