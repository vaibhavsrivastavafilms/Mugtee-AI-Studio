const DEFAULT_TIMEOUT_MS = 60_000
/** Script step runs deep research + up to 3 LLM passes + storyboard SOP — often exceeds 60s. */
export const SCRIPT_GENERATION_TIMEOUT_MS = 180_000
const DEFAULT_MAX_RETRIES = 2

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type PipelineFetchOptions = RequestInit & {
  timeoutMs?: number
  maxRetries?: number
  /** Only retry on network/5xx — not 4xx client errors */
  retryOnStatuses?: number[]
}

/**
 * Fetch with AbortController timeout and optional exponential backoff retries.
 * Used by Quick Cut pipeline for script/scenes (and other critical steps).
 */
export async function pipelineFetch(
  url: string,
  options: PipelineFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryOnStatuses = [502, 503, 504],
    ...init
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (
        attempt < maxRetries &&
        retryOnStatuses.includes(res.status)
      ) {
        await sleep(400 * Math.pow(2, attempt))
        continue
      }

      return res
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      const aborted = err instanceof Error && err.name === 'AbortError'
      if (attempt < maxRetries) {
        await sleep(400 * Math.pow(2, attempt))
        continue
      }
      if (aborted) {
        throw new Error('This step took too long — your work is saved. Try again.')
      }
      throw err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed')
}

export async function pipelineFetchJson<T = Record<string, unknown>>(
  url: string,
  options: PipelineFetchOptions = {}
): Promise<{ res: Response; data: T }> {
  const res = await pipelineFetch(url, options)
  const data = (await res.json().catch(() => ({}))) as T
  return { res, data }
}
