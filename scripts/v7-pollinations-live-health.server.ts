/**
 * Live Pollinations connectivity + actual generation probe (minimal spend).
 *
 * Usage:
 *   npx tsx scripts/v7-pollinations-live-health.server.ts
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

type HealthResult = {
  pass: boolean
  apiKeyLoaded: boolean
  authenticated: boolean
  balance: number | null
  v1ModelsStatus: number | null
  imageCatalogCount: number
  imageModel: string | null
  imageHttpStatus: number | null
  imageBytes: number | null
  imageError: string | null
  videoModel: string | null
  videoProbeSkipped: boolean
  videoError: string | null
  textModel: string | null
  audioModel: string | null
}

async function fetchModelsEndpoint(path: string): Promise<{ status: number; models: string[] }> {
  const { GEN_POLLINATIONS_BASE, pollinationsAuthHeaders, hasPollinationsApiKey } = await import(
    '../lib/pollinations/models.server'
  )
  if (!hasPollinationsApiKey()) return { status: 0, models: [] }

  const res = await fetch(`${GEN_POLLINATIONS_BASE}${path}`, {
    headers: { Accept: 'application/json', ...pollinationsAuthHeaders() },
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) return { status: res.status, models: [] }

  const data = (await res.json()) as unknown
  const list = (
    Array.isArray(data)
      ? data
      : Array.isArray((data as { data?: unknown[] })?.data)
        ? (data as { data: unknown[] }).data
        : []
  ) as Record<string, unknown>[]

  const models = list
    .map((entry) => {
      const id = typeof entry.name === 'string' ? entry.name : typeof entry.id === 'string' ? entry.id : ''
      return id.trim()
    })
    .filter(Boolean)

  return { status: res.status, models }
}

async function rankImageCandidates(): Promise<string[]> {
  const { discoverPollinationsModels } = await import('../lib/pollinations/models.server')
  const models = await discoverPollinationsModels(true)
  return models
    .filter((m) => m.type === 'image')
    .sort((a, b) => {
      if (a.questEligible !== b.questEligible) return a.questEligible ? -1 : 1
      return a.pollenCost - b.pollenCost
    })
    .map((m) => m.id)
}

async function probeImageModel(model: string): Promise<{
  ok: boolean
  httpStatus: number | null
  bytes: number | null
  error: string | null
}> {
  const { GEN_POLLINATIONS_BASE, pollinationsAuthHeaders } = await import('../lib/pollinations/models.server')

  const prompt = 'minimal health check plate on dark table, photorealistic, no text'
  const url = new URL(`${GEN_POLLINATIONS_BASE}/image/${encodeURIComponent(prompt)}`)
  url.searchParams.set('model', model)
  url.searchParams.set('width', '512')
  url.searchParams.set('height', '512')
  url.searchParams.set('seed', '424242')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'image/*', ...pollinationsAuthHeaders() },
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const body = (await res.text()).slice(0, 400)
      return { ok: false, httpStatus: res.status, bytes: null, error: body || res.statusText }
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('image')) {
      const body = (await res.text()).slice(0, 400)
      return { ok: false, httpStatus: res.status, bytes: null, error: `non-image response: ${body}` }
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 512) {
      return { ok: false, httpStatus: res.status, bytes: buffer.length, error: 'empty image buffer' }
    }

    return { ok: true, httpStatus: res.status, bytes: buffer.length, error: null }
  } catch (err) {
    return {
      ok: false,
      httpStatus: null,
      bytes: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  const {
    inspectPollinationsKeyConfig,
    probePollinationsAuthenticationStatus,
  } = await import('../lib/pollinations/key-diagnostics.server')
  const { hasPollinationsApiKey } = await import('../lib/pollinations/models.server')
  const { fetchPollinationsBalanceEndpoint } = await import('../lib/pollinations/entitlement.server')
  const { getOpenRouterTextProviderHealth } = await import('../lib/ai/providers/openrouter/health')
  const { selectBestFreeOpenRouterModel } = await import('../lib/ai/providers/openrouter/router')
  const { evaluatePollinationsVideoEntitlement } = await import('../lib/pollinations/entitlement.server')

  const keyConfig = inspectPollinationsKeyConfig()
  const apiKeyLoaded = hasPollinationsApiKey()
  const auth = await probePollinationsAuthenticationStatus()
  const balance = apiKeyLoaded ? await fetchPollinationsBalanceEndpoint() : null

  const v1 = await fetchModelsEndpoint('/v1/models')
  const imageCatalog = await fetchModelsEndpoint('/image/models')

  let imageModel: string | null = null
  let imageHttpStatus: number | null = null
  let imageBytes: number | null = null
  let imageError: string | null = null

  if (apiKeyLoaded && auth.authenticated) {
    const candidates = await rankImageCandidates()
    const unique = [...new Set(candidates)]
    console.info('[POLLINATIONS HEALTH] image candidates', unique.slice(0, 12))

    for (const candidate of unique) {
      console.info('[POLLINATIONS HEALTH] probing image model', candidate)
      const probe = await probeImageModel(candidate)
      if (probe.ok) {
        imageModel = candidate
        imageHttpStatus = probe.httpStatus
        imageBytes = probe.bytes
        break
      }
      imageError = `${candidate}: HTTP ${probe.httpStatus ?? 'n/a'} — ${probe.error}`
      console.warn('[POLLINATIONS HEALTH] image probe failed', imageError)
    }
  }

  const videoEntitlement = await evaluatePollinationsVideoEntitlement({
    durationSec: 5,
    probeSpendable: true,
    forceRefresh: true,
    width: 720,
    height: 1280,
  })

  let textModel: string | null = null
  try {
    const textHealth = await getOpenRouterTextProviderHealth()
    textModel = textHealth.workingModel ?? (await selectBestFreeOpenRouterModel())
  } catch {
    textModel = null
  }
  if (!textModel) textModel = 'google/gemma-4-31b-it:free'

  const result: HealthResult = {
    pass: Boolean(apiKeyLoaded && auth.authenticated && imageModel),
    apiKeyLoaded,
    authenticated: auth.authenticated,
    balance,
    v1ModelsStatus: v1.status || null,
    imageCatalogCount: imageCatalog.models.length,
    imageModel,
    imageHttpStatus,
    imageBytes,
    imageError: imageModel ? null : imageError,
    videoModel: videoEntitlement.model,
    videoProbeSkipped: true,
    videoError: videoEntitlement.entitled && videoEntitlement.affordable ? null : videoEntitlement.reason,
    textModel,
    audioModel: null,
  }

  console.log('\n[POLLINATIONS HEALTH]')
  console.log(`imageModel=${result.imageModel ?? 'NONE'}`)
  console.log(`videoModel=${result.videoModel ?? 'NONE'}`)
  console.log(`textModel=${result.textModel ?? 'NONE'}`)
  console.log(`balance=${result.balance ?? 'unknown'}`)
  console.log(`status=${result.pass ? 'PASS' : 'FAIL'}`)
  console.log('HEALTH_JSON:' + JSON.stringify(result))
  console.log(JSON.stringify(result, null, 2))

  if (result.pass && result.imageModel) {
    process.env.V7_POLLINATIONS_IMAGE_MODEL = result.imageModel
    process.env.V7_POLLINATIONS_VIDEO_MODEL = result.videoModel ?? ''
  }

  process.exit(result.pass ? 0 : 1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
