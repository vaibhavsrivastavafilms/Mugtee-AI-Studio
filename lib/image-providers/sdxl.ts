import 'server-only'

const TOGETHER_API_URL = 'https://api.together.xyz/v1/images/generations'
const DEFAULT_MODEL =
  process.env.V7_SDXL_MODEL?.trim() ?? 'stabilityai/stable-diffusion-xl-base-1.0'

export function hasSdxlApiKey(): boolean {
  return Boolean(process.env.TOGETHER_API_KEY?.trim() || process.env.STABILITY_API_KEY?.trim())
}

function resolveDimensions(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1344, height: 768 }
    case '1:1':
      return { width: 1024, height: 1024 }
    case '4:5':
      return { width: 896, height: 1120 }
    case '9:16':
    default:
      return { width: 768, height: 1344 }
  }
}

async function generateTogetherSdxl(
  prompt: string,
  options?: { aspectRatio?: string; seed?: number }
): Promise<string | null> {
  const key = process.env.TOGETHER_API_KEY?.trim()
  if (!key) return null

  const { width, height } = resolveDimensions(options?.aspectRatio)
  const model = DEFAULT_MODEL

  try {
    const res = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        prompt: prompt.slice(0, 4000),
        width,
        height,
        n: 1,
        seed: options?.seed,
        response_format: 'url',
      }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[IMAGE_ERROR] sdxl-together', { status: res.status, sample: body.slice(0, 400) })
      return null
    }

    const json = (await res.json().catch(() => null)) as {
      data?: Array<{ url?: string; b64_json?: string }>
    } | null
    const item = json?.data?.[0]
    if (item?.url) return item.url
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
    return null
  } catch (err) {
    console.error('[IMAGE_ERROR] sdxl-together', err)
    return null
  }
}

async function generateStabilitySdxl(
  prompt: string,
  options?: { aspectRatio?: string; seed?: number }
): Promise<string | null> {
  const key = process.env.STABILITY_API_KEY?.trim()
  if (!key) return null

  const { width, height } = resolveDimensions(options?.aspectRatio)

  try {
    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      body: (() => {
        const form = new FormData()
        form.append('prompt', prompt.slice(0, 4000))
        form.append('output_format', 'png')
        form.append('aspect_ratio', options?.aspectRatio ?? '9:16')
        if (options?.seed != null) form.append('seed', String(options.seed))
        return form
      })(),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[IMAGE_ERROR] sdxl-stability', { status: res.status, sample: body.slice(0, 400) })
      return null
    }

    const json = (await res.json().catch(() => null)) as { image?: string } | null
    if (json?.image) return `data:image/png;base64,${json.image}`
    return null
  } catch (err) {
    console.error('[IMAGE_ERROR] sdxl-stability', err)
    return null
  }
}

/** SDXL via Together (preferred) or Stability API. */
export async function generateSdxlImage(
  prompt: string,
  options?: { aspectRatio?: string; seed?: number }
): Promise<{ url: string; model: string } | null> {
  if (process.env.TOGETHER_API_KEY?.trim()) {
    const url = await generateTogetherSdxl(prompt, options)
    if (url) return { url, model: DEFAULT_MODEL }
  }

  const stabilityUrl = await generateStabilitySdxl(prompt, options)
  if (stabilityUrl) return { url: stabilityUrl, model: 'stability-sd3' }

  return null
}

export function getSdxlModelId(): string {
  return DEFAULT_MODEL
}
