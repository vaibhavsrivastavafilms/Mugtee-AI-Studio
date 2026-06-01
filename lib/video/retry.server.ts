import 'server-only'

const DEFAULT_DELAYS_MS = [800, 1600, 3200]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return true
  const msg = err.message.toLowerCase()
  if (msg.includes('401') || msg.includes('403') || msg.includes('404')) return false
  if (msg.includes('invalid') && msg.includes('url')) return false
  return true
}

/** Retry an async operation with exponential backoff (default 3 attempts). */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number
    delaysMs?: number[]
    label?: string
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3
  const delays = options?.delaysMs ?? DEFAULT_DELAYS_MS
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= maxAttempts - 1 || !isRetryableError(err)) break
      await sleep(delays[attempt] ?? delays[delays.length - 1] ?? 3200)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(options?.label ? `${options.label} failed` : 'Operation failed after retries')
}
