/**
 * Remotion `concurrency` = parallel Chrome tabs capturing frames.
 * Vercel serverless typically has ~2 GB RAM. Two 1080x1920 tabs plus
 * compositor + OffthreadVideo caused:
 * "Could not take a screenshot because Google Chrome ran out of memory or disk space."
 */
export function resolveRemotionConcurrencyFrom(
  env: {
    VERCEL?: string
    REMOTION_CONCURRENCY?: string
    NODE_ENV?: string
  },
  cpuCount: number
): number {
  if (env.VERCEL === '1') return 1

  const raw = env.REMOTION_CONCURRENCY?.trim()
  if (raw) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.min(parsed, 8)
    }
  }
  if (env.NODE_ENV === 'development') return 1
  return Math.min(2, Math.max(1, Math.floor(cpuCount / 2)))
}
