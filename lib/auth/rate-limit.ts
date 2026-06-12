/** In-memory sliding-window rate limiter for API routes (per-instance). */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  if (bucket.count >= max) return true

  bucket.count += 1
  return false
}

export function rateLimitResponse() {
  return { error: 'Too many requests. Try again shortly.' }
}
