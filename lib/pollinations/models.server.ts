import 'server-only'

import { isPollinationsImageReady } from '@/lib/pollinations/entitlement-core'
import { evaluatePollinationsVideoEntitlement } from '@/lib/pollinations/entitlement.server'
import { PollinationsError } from '@/lib/pollinations/errors.server'
import {
  GEN_POLLINATIONS_BASE,
  readPollinationsApiKeyFromEnv,
} from '@/lib/pollinations/key-diagnostics-core'
import { probePollinationsAuthenticationStatus } from '@/lib/pollinations/key-diagnostics.server'

export type PollinationsCapability = 'text' | 'image' | 'video' | 'audio'

export type PollinationsModelInfo = {
  id: string
  type: PollinationsCapability
  supportsImageToVideo: boolean
  /** Models usable without paid-only pollen (quest / low-cost tier). */
  questEligible: boolean
  pollenCost: number
}

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000
export { GEN_POLLINATIONS_BASE } from '@/lib/pollinations/key-diagnostics-core'

type ModelCache = {
  expiresAt: number
  models: PollinationsModelInfo[]
}

let cache: ModelCache | null = null

export function readPollinationsApiKey(): string | undefined {
  return readPollinationsApiKeyFromEnv()
}

export function hasPollinationsApiKey(): boolean {
  return Boolean(readPollinationsApiKey())
}

export function pollinationsAuthHeaders(apiKey?: string): HeadersInit {
  const key = apiKey?.trim() || readPollinationsApiKey()
  return key ? { Authorization: `Bearer ${key}` } : {}
}

export function appendPollinationsAuth(url: URL): URL {
  const key = readPollinationsApiKey()
  if (key && !url.searchParams.has('key')) {
    url.searchParams.set('key', key)
  }
  return url
}

function parsePollenCost(raw: Record<string, unknown>): number {
  const pricing = raw.pricing as Record<string, string | number | undefined> | undefined
  if (!pricing) return 0
  const candidates = [
    pricing.completionImageTokens,
    pricing.completionVideoSeconds,
    pricing.promptImageTokens,
    pricing.prompt,
    pricing.completion,
  ]
  for (const value of candidates) {
    const n = Number(value ?? NaN)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function inferCapability(raw: Record<string, unknown>): PollinationsCapability {
  const category = typeof raw.category === 'string' ? raw.category.toLowerCase() : ''
  const outputs = Array.isArray(raw.output_modalities)
    ? raw.output_modalities.map((v) => String(v).toLowerCase())
    : []
  const inputs = Array.isArray(raw.input_modalities)
    ? raw.input_modalities.map((v) => String(v).toLowerCase())
    : []

  if (category === 'video' || outputs.includes('video')) return 'video'
  if ((category === 'audio' || outputs.includes('audio')) && outputs.includes('audio')) {
    return 'audio'
  }
  if (
    category === 'text' ||
    category === 'llm' ||
    category === 'chat' ||
    outputs.includes('text') ||
    (outputs.length === 0 && inputs.includes('text'))
  ) {
    return 'text'
  }
  return 'image'
}

function parseModelsPayload(data: unknown): PollinationsModelInfo[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] })?.data)
      ? (data as { data: unknown[] }).data
      : []

  const models: PollinationsModelInfo[] = []

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>
    const id = typeof raw.name === 'string' ? raw.name : typeof raw.id === 'string' ? raw.id : ''
    if (!id.trim()) continue

    const type = inferCapability(raw)
    const inputs = Array.isArray(raw.input_modalities)
      ? raw.input_modalities.map((v) => String(v).toLowerCase())
      : []
    const supportsImageToVideo = type === 'video' && inputs.includes('image')

    models.push({
      id: id.trim(),
      type,
      supportsImageToVideo,
      questEligible: raw.paid_only !== true,
      pollenCost: parsePollenCost(raw),
    })
  }

  return models
}

const FALLBACK_IMAGE_MODELS: PollinationsModelInfo[] = [
  { id: 'flux', type: 'image', supportsImageToVideo: false, questEligible: true, pollenCost: 0.004 },
  { id: 'zimage', type: 'image', supportsImageToVideo: false, questEligible: true, pollenCost: 0.004 },
]

const FALLBACK_TEXT_MODELS: PollinationsModelInfo[] = [
  { id: 'qwen-safety', type: 'text', supportsImageToVideo: false, questEligible: true, pollenCost: 0.001 },
  { id: 'muse-glimmer', type: 'text', supportsImageToVideo: false, questEligible: true, pollenCost: 0.001 },
  { id: 'gpt-oss', type: 'text', supportsImageToVideo: false, questEligible: true, pollenCost: 0.001 },
  { id: 'minimax', type: 'text', supportsImageToVideo: false, questEligible: true, pollenCost: 0.001 },
]

/** Models commonly allowed on publishable (pk_) keys with restricted scopes. */
const PUBLISHABLE_KEY_PREFERRED_TEXT_MODELS = ['qwen-safety']

const FALLBACK_AUDIO_MODELS: PollinationsModelInfo[] = [
  { id: 'elevenlabs', type: 'audio', supportsImageToVideo: false, questEligible: true, pollenCost: 0.002 },
  { id: 'kokoro', type: 'audio', supportsImageToVideo: false, questEligible: true, pollenCost: 0.002 },
  { id: 'elevenmusic', type: 'audio', supportsImageToVideo: false, questEligible: false, pollenCost: 0.01 },
  { id: 'eleven-sfx', type: 'audio', supportsImageToVideo: false, questEligible: false, pollenCost: 0.005 },
]

const FALLBACK_VIDEO_MODELS: PollinationsModelInfo[] = [
  { id: 'nova-reel', type: 'video', supportsImageToVideo: true, questEligible: true, pollenCost: 0.08 },
  { id: 'wan-fast', type: 'video', supportsImageToVideo: true, questEligible: false, pollenCost: 0.01 },
  { id: 'veo', type: 'video', supportsImageToVideo: true, questEligible: false, pollenCost: 0.1 },
]

export async function discoverPollinationsModels(force = false): Promise<PollinationsModelInfo[]> {
  if (!force && cache && cache.expiresAt > Date.now()) {
    return cache.models
  }

  const merged: PollinationsModelInfo[] = []

  for (const path of ['/text/models', '/audio/models', '/image/models']) {
    try {
      const res = await fetch(`${GEN_POLLINATIONS_BASE}${path}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        merged.push(...parseModelsPayload((await res.json()) as unknown))
      }
    } catch {
      // fall through
    }
  }

  const deduped = new Map<string, PollinationsModelInfo>()
  for (const model of merged) {
    if (!deduped.has(model.id)) deduped.set(model.id, model)
  }
  const parsed = [...deduped.values()]

  if (parsed.length > 0) {
    cache = { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, models: parsed }
    return parsed
  }

  const fallback = [
    ...FALLBACK_TEXT_MODELS,
    ...FALLBACK_IMAGE_MODELS,
    ...FALLBACK_VIDEO_MODELS,
    ...FALLBACK_AUDIO_MODELS,
  ]
  cache = { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, models: fallback }
  return fallback
}

export async function listPollinationsTextModelCandidates(options?: {
  preferred?: string
  exclude?: string[]
}): Promise<string[]> {
  const envOverride = process.env.POLLINATIONS_TEXT_MODEL?.trim()
  const models = await discoverPollinationsModels()
  let eligible = rankModels(models.filter((model) => model.type === 'text'))
  const excluded = new Set((options?.exclude ?? []).map((id) => id.trim()).filter(Boolean))
  eligible = eligible.filter((model) => !excluded.has(model.id))

  const ordered: string[] = []
  const key = readPollinationsApiKeyFromEnv()
  if (key?.startsWith('pk_')) {
    ordered.push(...PUBLISHABLE_KEY_PREFERRED_TEXT_MODELS)
  }
  if (envOverride) ordered.push(envOverride)
  if (options?.preferred?.trim()) ordered.push(options.preferred.trim())
  for (const model of eligible) ordered.push(model.id)

  const seen = new Set<string>()
  return ordered.filter((id) => {
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function invalidatePollinationsModelCache(): void {
  cache = null
}

function rankModels(models: PollinationsModelInfo[]): PollinationsModelInfo[] {
  return [...models].sort((a, b) => {
    if (a.questEligible !== b.questEligible) return a.questEligible ? -1 : 1
    return a.pollenCost - b.pollenCost
  })
}

export async function selectBestPollinationsModel(
  capability: PollinationsCapability,
  options?: { imageToVideo?: boolean; preferred?: string; exclude?: string[] }
): Promise<string> {
  const envOverride =
    capability === 'text'
      ? process.env.POLLINATIONS_TEXT_MODEL?.trim()
      : capability === 'image'
        ? process.env.POLLINATIONS_IMAGE_MODEL?.trim() ||
          process.env.V7_POLLINATIONS_IMAGE_MODEL?.trim()
        : capability === 'video'
          ? process.env.POLLINATIONS_VIDEO_MODEL?.trim() ||
            process.env.V7_POLLINATIONS_VIDEO_MODEL?.trim()
          : process.env.POLLINATIONS_AUDIO_MODEL?.trim()

  const models = await discoverPollinationsModels()
  let eligible = models.filter((model) => model.type === capability)

  if (capability === 'video' && options?.imageToVideo) {
    eligible = eligible.filter((model) => model.supportsImageToVideo)
  }

  const excluded = new Set((options?.exclude ?? []).map((id) => id.trim()).filter(Boolean))

  if (envOverride && eligible.some((model) => model.id === envOverride)) {
    return envOverride
  }

  if (options?.preferred?.trim()) {
    const preferred = options.preferred.trim()
    if (eligible.some((model) => model.id === preferred)) return preferred
  }

  eligible = rankModels(eligible).filter((model) => !excluded.has(model.id))

  if (eligible.length === 0) {
    throw new PollinationsError({
      code: 'POLLINATIONS_MODEL_UNAVAILABLE',
      message: `No Pollinations ${capability} models available`,
      action:
        capability === 'audio'
          ? 'Audio generation is not available via Pollinations.'
          : 'Check model catalog at GET /image/models or set POLLINATIONS_API_KEY.',
    })
  }

  return eligible[0].id
}

function pickAudioModelFromCatalog(
  models: PollinationsModelInfo[],
  preferredIds: string[],
  envOverride?: string
): string | null {
  const eligible = rankModels(models.filter((model) => model.type === 'audio'))
  if (envOverride && eligible.some((model) => model.id === envOverride)) {
    return envOverride
  }
  for (const id of preferredIds) {
    if (eligible.some((model) => model.id === id)) return id
  }
  return eligible[0]?.id ?? null
}

export async function selectPollinationsTtsModel(options?: { preferred?: string }): Promise<string> {
  const models = await discoverPollinationsModels()
  const selected =
    pickAudioModelFromCatalog(
      models,
      ['elevenlabs', 'kokoro', 'elevenflash', 'eleven-multilingual-v2'],
      process.env.POLLINATIONS_TTS_MODEL?.trim() || options?.preferred
    ) ?? 'elevenlabs'
  return selected
}

export async function selectPollinationsMusicModel(options?: { preferred?: string }): Promise<string> {
  const models = await discoverPollinationsModels()
  const selected =
    pickAudioModelFromCatalog(
      models,
      ['elevenmusic', 'lyria-3-clip'],
      process.env.POLLINATIONS_MUSIC_MODEL?.trim() || options?.preferred
    ) ?? 'elevenmusic'
  return selected
}

export async function selectPollinationsSfxModel(options?: { preferred?: string }): Promise<string> {
  const models = await discoverPollinationsModels()
  const selected =
    pickAudioModelFromCatalog(
      models,
      ['eleven-sfx'],
      process.env.POLLINATIONS_SFX_MODEL?.trim() || options?.preferred
    ) ?? 'eleven-sfx'
  return selected
}

/** Select best affordable image-to-video model from live Pollinations catalog. */
export async function selectBestPollinationsVideoModel(options?: {
  preferred?: string
  durationSec?: number
}): Promise<string> {
  const entitlement = await evaluatePollinationsVideoEntitlement({
    durationSec: options?.durationSec ?? 5,
    probeSpendable: true,
  })
  if (options?.preferred?.trim() && entitlement.model === options.preferred.trim()) {
    return options.preferred.trim()
  }
  if (entitlement.model) return entitlement.model
  throw new PollinationsError({
    code:
      entitlement.code === 'POLLINATIONS_CREDITS_REQUIRED'
        ? 'POLLINATIONS_CREDITS_REQUIRED'
        : entitlement.code ?? 'POLLINATIONS_MODEL_UNAVAILABLE',
    message: entitlement.reason ?? 'No affordable Pollinations video model available',
    action: 'Top up pollen at https://enter.pollinations.ai',
  })
}

async function verifyPollinationsAuthentication(): Promise<{ ok: boolean; httpStatus?: number }> {
  const probe = await probePollinationsAuthenticationStatus()
  if (probe.authenticated) return { ok: true, httpStatus: probe.httpStatus ?? 200 }
  if (probe.code === 'POLLINATIONS_API_KEY_REQUIRED') {
    return { ok: false, httpStatus: undefined }
  }
  return { ok: false, httpStatus: probe.httpStatus ?? 401 }
}

export type PollinationsHealthReport = {
  ready: boolean
  authenticated: boolean
  entitled: boolean
  modelAvailable: boolean
  generationAvailable: boolean
  quotaAvailable: boolean | null
  imageReady: boolean
  videoReady: boolean
  imageModel: string | null
  videoModel: string | null
  balance: number | null
  estimatedVideoCost: number | null
  reason: string | null
  code: string | null
}

export async function probePollinationsHealth(options?: {
  forceRefresh?: boolean
}): Promise<PollinationsHealthReport> {
  let catalogModels: PollinationsModelInfo[] = []
  try {
    catalogModels = await discoverPollinationsModels(true)
  } catch {
    catalogModels = []
  }
  const modelAvailable =
    catalogModels.some((m) => m.type === 'image') &&
    catalogModels.some((m) => m.type === 'video' && m.supportsImageToVideo)

  const keyPresent = hasPollinationsApiKey()
  if (!keyPresent) {
    return {
      ready: false,
      authenticated: false,
      entitled: false,
      modelAvailable,
      generationAvailable: false,
      quotaAvailable: null,
      imageReady: false,
      videoReady: false,
      imageModel: null,
      videoModel: null,
      balance: null,
      estimatedVideoCost: null,
      reason:
        'POLLINATIONS_API_KEY_REQUIRED — set sk_… from https://enter.pollinations.ai/keys (placeholder keys are rejected).',
      code: 'POLLINATIONS_API_KEY_REQUIRED',
    }
  }

  const auth = await verifyPollinationsAuthentication()
  if (auth.ok) {
    console.info('[pollinations] HTTP connected')
  }
  if (!auth.ok) {
    const authMessage =
      auth.httpStatus === 401 || auth.httpStatus === 403
        ? 'POLLINATIONS_AUTH_FAILED — Pollinations rejected the configured API key. Rotate sk_ key at https://enter.pollinations.ai/keys, update POLLINATIONS_API_KEY, and restart the dev server.'
        : 'POLLINATIONS_AUTH_FAILED — unable to verify Pollinations authentication. Check POLLINATIONS_API_KEY and network access to gen.pollinations.ai.'
    return {
      ready: false,
      authenticated: false,
      entitled: false,
      modelAvailable,
      generationAvailable: false,
      quotaAvailable: null,
      imageReady: false,
      videoReady: false,
      imageModel: null,
      videoModel: null,
      balance: null,
      estimatedVideoCost: null,
      reason: authMessage,
      code: 'POLLINATIONS_AUTH_FAILED',
    }
  }

  let imageModel: string | null = null
  try {
    imageModel = await selectBestPollinationsModel('image')
  } catch {
    imageModel = null
  }

  const videoEntitlement = await evaluatePollinationsVideoEntitlement({
    durationSec: 5,
    probeSpendable: true,
    forceRefresh: options?.forceRefresh,
    width: 720,
    height: 1280,
  })

  const imageReady = isPollinationsImageReady({
    imageModel,
    authenticated: videoEntitlement.authenticated,
    balance: videoEntitlement.balance,
    code: videoEntitlement.code,
  })
  const videoReady =
    videoEntitlement.entitled &&
    videoEntitlement.affordable &&
    Boolean(videoEntitlement.model) &&
    modelAvailable
  const ready = imageReady && videoReady

  return {
    ready,
    authenticated: videoEntitlement.authenticated,
    entitled: videoEntitlement.entitled,
    modelAvailable,
    generationAvailable: videoEntitlement.generationAvailable,
    quotaAvailable: videoEntitlement.quotaAvailable ? true : videoEntitlement.balance === 0 ? false : null,
    imageReady,
    videoReady,
    imageModel,
    videoModel: videoEntitlement.model,
    balance: videoEntitlement.balance,
    estimatedVideoCost: videoEntitlement.estimatedCost,
    reason: ready ? null : videoEntitlement.reason,
    code: ready ? null : videoEntitlement.code,
  }
}
