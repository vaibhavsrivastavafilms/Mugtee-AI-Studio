import 'server-only'

import { TextProviderError } from '@/lib/ai/errors'
import { fetchWithTimeout } from '@/lib/ai/providers/shared'
import { getOpenRouterHeaders } from '@/lib/ai/providers/openrouter/client'

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
export const OPENROUTER_MODEL_CACHE_TTL_MS = 5 * 60 * 1000
export const OPENROUTER_MODEL_BLACKLIST_TTL_MS = 10 * 60 * 1000

type OpenRouterApiModel = {
  id: string
  name?: string
  description?: string
  created?: number
  context_length?: number
  pricing?: { prompt?: string; completion?: string }
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
  }
}

export type OpenRouterFreeModel = {
  id: string
  created: number
  contextLength: number
  familyRank: number
  paramScore: number
}

type RouterCacheState = {
  workingModel: string | null
  workingSince: number | null
  lastFailure: number | null
  blacklist: Map<string, number>
  availableModels: OpenRouterFreeModel[]
  lastRefresh: number
  cacheExpires: number
}

const FAMILY_PATTERNS: Array<{ rank: number; pattern: RegExp }> = [
  { rank: 1, pattern: /qwen/i },
  { rank: 2, pattern: /deepseek/i },
  { rank: 3, pattern: /gemma/i },
  { rank: 4, pattern: /mistral|mixtral/i },
  { rank: 5, pattern: /llama/i },
]

const EXCLUDED_PATTERNS = [
  /embed/i,
  /embedding/i,
  /rerank/i,
  /moderation/i,
  /whisper/i,
  /tts/i,
  /audio/i,
  /dall-e|dalle|stable-diffusion|flux|midjourney|image-gen|vision/i,
]

function logOpenRouter(message: string, extra?: Record<string, unknown>): void {
  if (extra) {
    console.info(`[openrouter] ${message}`, extra)
  } else {
    console.info(`[openrouter] ${message}`)
  }
}

function isPricingZero(value: string | undefined): boolean {
  if (value == null) return false
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n === 0 : value === '0'
}

export function isOpenRouterModelFree(raw: OpenRouterApiModel): boolean {
  if (raw.id.endsWith(':free')) return true
  return (
    isPricingZero(raw.pricing?.prompt) && isPricingZero(raw.pricing?.completion)
  )
}

export function isOpenRouterTextChatModel(raw: OpenRouterApiModel): boolean {
  const haystack = `${raw.id} ${raw.name ?? ''} ${raw.description ?? ''}`

  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(haystack)) return false
  }

  const architecture = raw.architecture
  if (architecture) {
    const outputs = architecture.output_modalities ?? []
    if (outputs.length > 0 && !outputs.includes('text')) return false

    const inputs = architecture.input_modalities ?? []
    if (inputs.length > 0 && !inputs.includes('text')) return false

    const modality = architecture.modality ?? ''
    if (/embed|audio|image|rerank/i.test(modality) && !/text/i.test(modality)) {
      return false
    }
  }

  if (architecture?.modality === 'text->text') return true

  return /chat|instruct|completion|llm|assistant|ling|gpt|claude|gemma|qwen|deepseek|mistral|mixtral|llama/i.test(
    haystack
  )
}

function parseParamScore(id: string, name: string): number {
  const haystack = `${id} ${name}`
  const matches = [...haystack.matchAll(/(\d+(?:\.\d+)?)\s*[bB]/gi)]
  if (matches.length === 0) return 0
  return Math.max(...matches.map((match) => Number.parseFloat(match[1])))
}

function resolveFamilyRank(id: string, name: string): number {
  const haystack = `${id} ${name}`
  for (const family of FAMILY_PATTERNS) {
    if (family.pattern.test(haystack)) return family.rank
  }
  return 6
}

function normalizeModel(raw: OpenRouterApiModel): OpenRouterFreeModel {
  const name = raw.name ?? raw.id
  return {
    id: raw.id,
    created: raw.created ?? 0,
    contextLength: raw.context_length ?? 0,
    familyRank: resolveFamilyRank(raw.id, name),
    paramScore: parseParamScore(raw.id, name),
  }
}

export function rankFreeModels(models: OpenRouterFreeModel[]): OpenRouterFreeModel[] {
  return [...models].sort((left, right) => {
    if (left.familyRank !== right.familyRank) return left.familyRank - right.familyRank
    if (right.contextLength !== left.contextLength) return right.contextLength - left.contextLength
    if (right.paramScore !== left.paramScore) return right.paramScore - left.paramScore
    if (right.created !== left.created) return right.created - left.created
    return left.id.localeCompare(right.id)
  })
}

export function isOpenRouterModelFailoverError(status: number, body: string): boolean {
  if (status === 429 || status === 404 || status === 410) return true

  const lower = body.toLowerCase()
  if (status === 400) {
    return (
      lower.includes('model') &&
      (lower.includes('not found') ||
        lower.includes('invalid') ||
        lower.includes('unavailable') ||
        lower.includes('does not exist') ||
        lower.includes('unknown'))
    )
  }

  if (status === 502 || status === 503) {
    return lower.includes('model') || lower.includes('provider') || lower.includes('unavailable')
  }

  return false
}

export class OpenRouterModelRouter {
  private state: RouterCacheState = {
    workingModel: null,
    workingSince: null,
    lastFailure: null,
    blacklist: new Map(),
    availableModels: [],
    lastRefresh: 0,
    cacheExpires: 0,
  }

  private refreshPromise: Promise<void> | null = null

  private purgeExpiredBlacklist(): void {
    const now = Date.now()
    for (const [modelId, expiresAt] of this.state.blacklist.entries()) {
      if (expiresAt <= now) this.state.blacklist.delete(modelId)
    }
  }

  isBlacklisted(modelId: string): boolean {
    this.purgeExpiredBlacklist()
    const expiresAt = this.state.blacklist.get(modelId)
    return expiresAt != null && expiresAt > Date.now()
  }

  blacklistModel(modelId: string, reason: string): void {
    this.state.blacklist.set(modelId, Date.now() + OPENROUTER_MODEL_BLACKLIST_TTL_MS)
    this.state.lastFailure = Date.now()
    logOpenRouter('Model blacklisted', { model: modelId, reason })
  }

  recordSuccess(modelId: string): void {
    this.state.workingModel = modelId
    this.state.workingSince = Date.now()
    this.state.lastFailure = null
    logOpenRouter('Generation successful', { model: modelId })
  }

  getRankedCandidateModels(): string[] {
    this.purgeExpiredBlacklist()
    const ranked = rankFreeModels(this.state.availableModels)
    const ids = ranked.map((model) => model.id).filter((id) => !this.isBlacklisted(id))

    const configured = process.env.OPENROUTER_MODEL?.trim()
    if (configured && ids.includes(configured) && !this.isBlacklisted(configured)) {
      return [configured, ...ids.filter((id) => id !== configured)]
    }

    const working = this.state.workingModel
    if (working && ids.includes(working)) {
      return [working, ...ids.filter((id) => id !== working)]
    }

    return ids
  }

  getHealthSnapshot(): {
    workingModel: string
    cachedModels: number
    blacklistedModels: number
    lastRefresh: string
  } {
    this.purgeExpiredBlacklist()
    return {
      workingModel: this.state.workingModel ?? '',
      cachedModels: this.state.availableModels.length,
      blacklistedModels: this.state.blacklist.size,
      lastRefresh: this.state.lastRefresh
        ? new Date(this.state.lastRefresh).toISOString()
        : '',
    }
  }

  async refreshCatalog(force = false): Promise<void> {
    if (!force && this.state.cacheExpires > Date.now() && this.state.availableModels.length > 0) {
      return
    }

    if (this.refreshPromise && !force) {
      await this.refreshPromise
      return
    }

    this.refreshPromise = (async () => {
      logOpenRouter('Catalog refreshed')
      const res = await fetchWithTimeout(
        OPENROUTER_MODELS_URL,
        { method: 'GET', headers: getOpenRouterHeaders() },
        30_000
      )

      const body = await res.text()
      if (res.status === 401 || res.status === 403) {
        throw new TextProviderError('OPENROUTER_AUTH_FAILED', 'openrouter', {
          httpStatus: res.status,
          message: 'OpenRouter authentication failed while loading model catalog',
        })
      }
      if (!res.ok) {
        throw new TextProviderError('OPENROUTER_API_UNAVAILABLE', 'openrouter', {
          httpStatus: res.status,
          message: body.slice(0, 300) || `OpenRouter models API HTTP ${res.status}`,
        })
      }

      const json = JSON.parse(body) as { data?: OpenRouterApiModel[] }
      const rawModels = json.data ?? []
      const freeModels = rawModels.filter(
        (model) => isOpenRouterModelFree(model) && isOpenRouterTextChatModel(model)
      )

      if (freeModels.length === 0) {
        throw new TextProviderError('OPENROUTER_NO_AVAILABLE_FREE_MODEL', 'openrouter', {
          message: 'No eligible free chat models found in OpenRouter catalog',
          attemptedModels: [],
        })
      }

      const normalized = freeModels.map(normalizeModel)
      const ranked = rankFreeModels(normalized)

      const configured = process.env.OPENROUTER_MODEL?.trim()
      if (configured && !ranked.some((model) => model.id === configured)) {
        logOpenRouter('Configured model unavailable. Falling back to automatic discovery.', {
          requested: configured,
        })
      }

      const now = Date.now()
      this.state.availableModels = ranked
      this.state.lastRefresh = now
      this.state.cacheExpires = now + OPENROUTER_MODEL_CACHE_TTL_MS

      logOpenRouter('Free models discovered', { count: ranked.length })
      logOpenRouter('Ranked models', { models: ranked.slice(0, 8).map((model) => model.id) })

      const first = this.getRankedCandidateModels()[0]
      if (first) {
        logOpenRouter('Selected model', { model: first })
      }
    })()

    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  async initialize(): Promise<void> {
    logOpenRouter('Connected')
    await this.refreshCatalog(true)
  }

  async ensureCatalog(): Promise<void> {
    await this.refreshCatalog(false)
  }
}

export const openRouterModelRouter = new OpenRouterModelRouter()

export async function initializeOpenRouter(): Promise<void> {
  await openRouterModelRouter.initialize()
}

export function getOpenRouterRouterHealthSnapshot(): ReturnType<
  OpenRouterModelRouter['getHealthSnapshot']
> | null {
  if (openRouterModelRouter.getHealthSnapshot().lastRefresh) {
    return openRouterModelRouter.getHealthSnapshot()
  }
  return null
}

/** Select the best currently available free OpenRouter model (dynamic discovery). */
export async function selectBestFreeOpenRouterModel(): Promise<string | null> {
  await openRouterModelRouter.ensureCatalog()
  const candidates = openRouterModelRouter.getRankedCandidateModels()
  return candidates.find((modelId) => !openRouterModelRouter.isBlacklisted(modelId)) ?? null
}
