import 'server-only'

const TOGETHER_API_URL = 'https://api.together.xyz/v1/images/generations'
const TOGETHER_MODEL = 'black-forest-labs/FLUX.1-schnell'

export function hasTogetherApiKey(): boolean {
  return Boolean(process.env.TOGETHER_API_KEY?.trim())
}

/** Generate an image via Together AI. Returns a remote URL or data URI. */
export async function generateTogetherImage(prompt: string): Promise<string | null> {
  const key = process.env.TOGETHER_API_KEY?.trim()
  if (!key) return null

  try {
    const res = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: TOGETHER_MODEL,
        prompt: prompt.slice(0, 4000),
        width: 1024,
        height: 1024,
        n: 1,
        response_format: 'url',
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[IMAGE_ERROR] together', {
        status: res.status,
        sample: body.slice(0, 400),
      })
      return null
    }

    const json = (await res.json().catch(() => null)) as {
      data?: Array<{ url?: string; b64_json?: string }>
    } | null
    const item = json?.data?.[0]
    if (item?.url) return item.url
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`

    console.error('[IMAGE_ERROR] together', { reason: 'no image in response' })
    return null
  } catch (err) {
    console.error('[IMAGE_ERROR] together', err)
    return null
  }
}
