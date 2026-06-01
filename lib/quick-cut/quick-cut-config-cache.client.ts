export type QuickCutConfig = Record<string, boolean | string | undefined> & {
  videoRenderEnabled?: boolean
  remotion?: boolean
  ffmpeg?: boolean
  freeTierOnly?: boolean
}

const TTL_MS = 30_000
let cached: { at: number; value: QuickCutConfig } | null = null
let inflight: Promise<QuickCutConfig> | null = null

/** Cached fetch for `/api/quick-cut/config` — safe to call from pipeline and export paths. */
export async function fetchQuickCutConfig(options?: {
  force?: boolean
}): Promise<QuickCutConfig> {
  const now = Date.now()
  if (!options?.force && cached && now - cached.at < TTL_MS) {
    return cached.value
  }
  if (!options?.force && inflight) return inflight

  inflight = fetch('/api/quick-cut/config', { cache: 'default' })
    .then((res) => res.json().catch(() => ({})) as Promise<QuickCutConfig>)
    .then((value) => {
      cached = { at: Date.now(), value }
      return value
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function invalidateQuickCutConfigCache(): void {
  cached = null
}
