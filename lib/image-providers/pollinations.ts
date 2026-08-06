/** Pollinations AI — keyless image generation via prompt URL. */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPollinationsImageUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 4000))}`
}

/** Fetch and verify Pollinations returns a real image (handles 429 with backoff). */
export async function fetchPollinationsImageDataUrl(
  prompt: string,
  options?: { maxAttempts?: number }
): Promise<string | null> {
  const url = getPollinationsImageUrl(prompt)
  const maxAttempts = options?.maxAttempts ?? 3

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(60_000),
        headers: { Accept: 'image/*' },
      })

      if (res.status === 429) {
        console.warn('[IMAGE_FALLBACK] pollinations rate limited', { attempt: attempt + 1 })
        await sleep(2_000 * (attempt + 1))
        continue
      }

      if (!res.ok) {
        console.error('[IMAGE_ERROR] pollinations', { status: res.status, attempt: attempt + 1 })
        return null
      }

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('image')) {
        const sample = (await res.text().catch(() => '')).slice(0, 200)
        console.error('[IMAGE_ERROR] pollinations non-image response', {
          contentType,
          sample,
        })
        return null
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 512) {
        console.error('[IMAGE_ERROR] pollinations empty image buffer')
        return null
      }

      const mime = contentType.split(';')[0]?.trim() || 'image/jpeg'
      return `data:${mime};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.error('[IMAGE_ERROR] pollinations fetch', err)
      if (attempt < maxAttempts - 1) {
        await sleep(2_000 * (attempt + 1))
        continue
      }
    }
  }

  return null
}
