import 'server-only'

import {
  estimatePollenCostForVideo,
  parsePollinationsPaymentRequired,
} from '@/lib/pollinations/entitlement-core'
import { fetchLivePollinationsFullCatalog } from '@/lib/pollinations/catalog-live.server'
import {
  capPollinationsVideoDimensions,
  estimateSceneVideoPollen,
  selectCheapestPollinationsVideoModelEntry,
} from '@/lib/pollinations/video-estimate-core'
import { PollinationsError } from '@/lib/pollinations/errors.server'
import {
  discoverPollinationsModels,
  GEN_POLLINATIONS_BASE,
  pollinationsAuthHeaders,
  readPollinationsApiKey,
  type PollinationsModelInfo,
} from '@/lib/pollinations/models.server'

export type PollinationsAccountKeyInfo = {
  valid: boolean
  pollenBudget: number | null
  pollenBudgetCap: number | null
}

export type PollinationsSpendableBalance = {
  spendable: number | null
  balanceEndpoint: number | null
  keyRemainingBudget: number | null
  source: 'cache' | 'account_api' | 'probe_402' | 'unknown'
}

export type PollinationsVideoEntitlement = {
  authenticated: boolean
  entitled: boolean
  modelAvailable: boolean
  generationAvailable: boolean
  quotaAvailable: boolean
  affordable: boolean
  balance: number | null
  estimatedCost: number | null
  model: string | null
  reason: string | null
  code: PollinationsError['code'] | 'POLLINATIONS_CREDITS_REQUIRED' | null
}

const SPENDABLE_CACHE_TTL_MS = 5 * 60 * 1000
let spendableCache: { value: number; expiresAt: number } | null = null

export function setPollinationsSpendableBalanceCache(balance: number): void {
  if (!Number.isFinite(balance) || balance < 0) return
  spendableCache = { value: balance, expiresAt: Date.now() + SPENDABLE_CACHE_TTL_MS }
}

export function clearPollinationsSpendableBalanceCache(): void {
  spendableCache = null
}

export { parsePollinationsPaymentRequired } from '@/lib/pollinations/entitlement-core'

export async function fetchPollinationsAccountKeyInfo(): Promise<PollinationsAccountKeyInfo | null> {
  if (!readPollinationsApiKey()) return null
  try {
    const res = await fetch(`${GEN_POLLINATIONS_BASE}/account/key`, {
      headers: { ...pollinationsAuthHeaders(), Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const body = (await res.json()) as Record<string, unknown>
    const budgetRaw = body.pollenBudget
    const pollenBudget =
      budgetRaw == null ? null : Number.isFinite(Number(budgetRaw)) ? Number(budgetRaw) : null
    return {
      valid: body.valid === true,
      pollenBudget,
      pollenBudgetCap: pollenBudget,
    }
  } catch {
    return null
  }
}

export async function fetchPollinationsBalanceEndpoint(): Promise<number | null> {
  if (!readPollinationsApiKey()) return null
  try {
    const res = await fetch(`${GEN_POLLINATIONS_BASE}/account/balance`, {
      headers: { ...pollinationsAuthHeaders(), Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const body = (await res.json()) as Record<string, unknown>
    const balance = Number(body.balance ?? body.pollen ?? body.credits ?? NaN)
    return Number.isFinite(balance) ? balance : null
  } catch {
    return null
  }
}

export async function resolvePollinationsSpendableBalance(options?: {
  forceRefresh?: boolean
}): Promise<PollinationsSpendableBalance> {
  if (options?.forceRefresh) {
    spendableCache = null
  } else if (spendableCache && spendableCache.expiresAt > Date.now()) {
    return {
      spendable: spendableCache.value,
      balanceEndpoint: null,
      keyRemainingBudget: null,
      source: 'cache',
    }
  }

  const [keyInfo, balanceEndpoint] = await Promise.all([
    fetchPollinationsAccountKeyInfo(),
    fetchPollinationsBalanceEndpoint(),
  ])

  const keyRemainingBudget = keyInfo?.pollenBudget ?? null

  let spendable: number | null = null
  if (keyRemainingBudget != null && balanceEndpoint != null) {
    spendable = Math.min(keyRemainingBudget, balanceEndpoint)
  } else if (keyRemainingBudget != null) {
    spendable = keyRemainingBudget
  } else {
    spendable = balanceEndpoint
  }

  return {
    spendable,
    balanceEndpoint,
    keyRemainingBudget,
    source: 'account_api',
  }
}

function rankAffordableVideoModels(
  models: PollinationsModelInfo[],
  spendable: number | null,
  durationSec: number
): Array<{ model: PollinationsModelInfo; estimatedCost: number }> {
  return models
    .filter((model) => model.type === 'video' && model.supportsImageToVideo)
    .map((model) => ({
      model,
      estimatedCost: estimatePollenCostForVideo(model, durationSec),
    }))
    .filter((entry) => spendable == null || entry.estimatedCost <= spendable)
    .sort((a, b) => {
      if (a.model.questEligible !== b.model.questEligible) {
        return a.model.questEligible ? -1 : 1
      }
      if (a.estimatedCost !== b.estimatedCost) return a.estimatedCost - b.estimatedCost
      return a.model.pollenCost - b.model.pollenCost
    })
}

export async function probePollinationsSpendableBalance(options?: {
  forceRefresh?: boolean
}): Promise<PollinationsSpendableBalance> {
  if (options?.forceRefresh) {
    spendableCache = null
  }
  const resolved = await resolvePollinationsSpendableBalance(options)
  if (resolved.source === 'cache') return resolved
  if (!readPollinationsApiKey()) return resolved

  try {
    const url = new URL(`${GEN_POLLINATIONS_BASE}/image/${encodeURIComponent('probe')}`)
    url.searchParams.set('model', 'zimage')
    url.searchParams.set('width', '64')
    url.searchParams.set('height', '64')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'image/*', ...pollinationsAuthHeaders() },
      signal: AbortSignal.timeout(30_000),
    })

    if (res.status === 402) {
      const body = await res.text()
      const parsed = parsePollinationsPaymentRequired(body)
      if (parsed.availableBalance != null) {
        setPollinationsSpendableBalanceCache(parsed.availableBalance)
        return {
          spendable: parsed.availableBalance,
          balanceEndpoint: resolved.balanceEndpoint,
          keyRemainingBudget: resolved.keyRemainingBudget,
          source: 'probe_402',
        }
      }
    }

    if (res.ok) {
      const spendable = resolved.spendable ?? resolved.balanceEndpoint ?? 0
      if (spendable > 0) setPollinationsSpendableBalanceCache(spendable)
      return { ...resolved, spendable, source: 'account_api' }
    }
  } catch {
    // fall through
  }

  return resolved
}

export async function selectAffordablePollinationsVideoModel(params: {
  durationSec: number
  spendable: number | null
  preferred?: string
  width?: number
  height?: number
}): Promise<{ model: string; estimatedCost: number; modelInfo: PollinationsModelInfo } | null> {
  const durationSec = Math.max(2, Math.min(15, Math.round(params.durationSec)))
  const capped = capPollinationsVideoDimensions(params.width ?? 720, params.height ?? 1280)

  try {
    const catalog = await fetchLivePollinationsFullCatalog()
    const ranked = catalog.videoEntries
      .map((entry) => {
        const estimate = estimateSceneVideoPollen({
          model: entry.model,
          raw: entry.raw,
          durationSec,
          width: capped.width,
          height: capped.height,
        })
        return { entry, estimatedCost: estimate.estimatedTotalPollen }
      })
      .filter((item) => params.spendable == null || item.estimatedCost <= params.spendable)
      .sort((a, b) => a.estimatedCost - b.estimatedCost)

    if (params.preferred?.trim()) {
      const preferred = params.preferred.trim()
      const match = ranked.find((item) => item.entry.model.id === preferred)
      if (match) {
        return {
          model: match.entry.model.id,
          estimatedCost: match.estimatedCost,
          modelInfo: {
            id: match.entry.model.id,
            type: 'video',
            supportsImageToVideo: match.entry.model.supportsImageToVideo,
            questEligible: match.entry.model.questEligible,
            pollenCost: match.estimatedCost / durationSec,
          },
        }
      }
    }

    const best = ranked[0]
    if (best) {
      return {
        model: best.entry.model.id,
        estimatedCost: best.estimatedCost,
        modelInfo: {
          id: best.entry.model.id,
          type: 'video',
          supportsImageToVideo: best.entry.model.supportsImageToVideo,
          questEligible: best.entry.model.questEligible,
          pollenCost: best.estimatedCost / durationSec,
        },
      }
    }

    const cheapestEntry = selectCheapestPollinationsVideoModelEntry({
      catalog: catalog.videoEntries,
      width: capped.width,
      height: capped.height,
      imageToVideoOnly: true,
    })
    if (cheapestEntry) {
      const estimate = estimateSceneVideoPollen({
        model: cheapestEntry.model,
        raw: cheapestEntry.raw,
        durationSec,
        width: capped.width,
        height: capped.height,
      })
      return {
        model: cheapestEntry.model.id,
        estimatedCost: estimate.estimatedTotalPollen,
        modelInfo: {
          id: cheapestEntry.model.id,
          type: 'video',
          supportsImageToVideo: cheapestEntry.model.supportsImageToVideo,
          questEligible: cheapestEntry.model.questEligible,
          pollenCost: estimate.estimatedTotalPollen / durationSec,
        },
      }
    }
  } catch {
    // fall through to static catalog pricing
  }

  const models = await discoverPollinationsModels(true)
  const ranked = rankAffordableVideoModels(models, params.spendable, durationSec)

  if (params.preferred?.trim()) {
    const preferred = params.preferred.trim()
    const match = ranked.find((entry) => entry.model.id === preferred)
    if (match) {
      return { model: match.model.id, estimatedCost: match.estimatedCost, modelInfo: match.model }
    }
  }

  const best = ranked[0]
  if (!best) return null
  return { model: best.model.id, estimatedCost: best.estimatedCost, modelInfo: best.model }
}

export async function evaluatePollinationsVideoEntitlement(params?: {
  durationSec?: number
  probeSpendable?: boolean
  forceRefresh?: boolean
  width?: number
  height?: number
}): Promise<PollinationsVideoEntitlement> {
  const durationSec = Math.max(2, Math.min(15, Math.round(params?.durationSec ?? 5)))

  if (!readPollinationsApiKey()) {
    return {
      authenticated: false,
      entitled: false,
      modelAvailable: false,
      generationAvailable: false,
      quotaAvailable: false,
      affordable: false,
      balance: null,
      estimatedCost: null,
      model: null,
      reason: 'POLLINATIONS_API_KEY_REQUIRED',
      code: 'POLLINATIONS_AUTH_FAILED',
    }
  }

  const models = await discoverPollinationsModels(true)
  const modelAvailable = models.some((m) => m.type === 'video' && m.supportsImageToVideo)
  if (!modelAvailable) {
    return {
      authenticated: true,
      entitled: false,
      modelAvailable: false,
      generationAvailable: false,
      quotaAvailable: false,
      affordable: false,
      balance: null,
      estimatedCost: null,
      model: null,
      reason: 'POLLINATIONS_MODEL_UNAVAILABLE',
      code: 'POLLINATIONS_MODEL_UNAVAILABLE',
    }
  }

  const balanceInfo = params?.probeSpendable
    ? await probePollinationsSpendableBalance({ forceRefresh: params?.forceRefresh })
    : await resolvePollinationsSpendableBalance({ forceRefresh: params?.forceRefresh })
  const spendable = balanceInfo.spendable

  console.info('[pollinations] Live Pollen balance:', spendable ?? 'UNKNOWN')

  const selection = await selectAffordablePollinationsVideoModel({
    durationSec,
    spendable,
    width: params?.width,
    height: params?.height,
  })

  if (spendable != null && spendable <= 0) {
    return {
      authenticated: true,
      entitled: false,
      modelAvailable: true,
      generationAvailable: false,
      quotaAvailable: false,
      affordable: false,
      balance: spendable,
      estimatedCost: selection?.estimatedCost ?? null,
      model: selection?.model ?? null,
      reason: 'POLLINATIONS_CREDITS_REQUIRED — top up pollen at https://enter.pollinations.ai',
      code: 'POLLINATIONS_CREDITS_REQUIRED',
    }
  }

  if (!selection) {
    const cheapest = rankAffordableVideoModels(models, null, durationSec)[0]
    const cheapestCost = cheapest?.estimatedCost ?? null
    const code =
      spendable != null && cheapestCost != null && spendable < cheapestCost
        ? ('POLLINATIONS_CREDITS_REQUIRED' as const)
        : 'POLLINATIONS_MODEL_UNAVAILABLE'

    return {
      authenticated: true,
      entitled: false,
      modelAvailable: true,
      generationAvailable: false,
      quotaAvailable: spendable != null ? spendable > 0 : false,
      affordable: false,
      balance: spendable,
      estimatedCost: cheapestCost,
      model: null,
      reason:
        code === 'POLLINATIONS_CREDITS_REQUIRED'
          ? 'POLLINATIONS_CREDITS_REQUIRED — insufficient Pollen for any image-to-video model'
          : 'POLLINATIONS_MODEL_UNAVAILABLE',
      code,
    }
  }

  const affordable = spendable == null || selection.estimatedCost <= spendable
  if (!affordable) {
    return {
      authenticated: true,
      entitled: false,
      modelAvailable: true,
      generationAvailable: false,
      quotaAvailable: false,
      affordable: false,
      balance: spendable,
      estimatedCost: selection.estimatedCost,
      model: selection.model,
      reason: 'POLLINATIONS_CREDITS_EXHAUSTED',
      code: 'POLLINATIONS_CREDITS_EXHAUSTED',
    }
  }

  return {
    authenticated: true,
    entitled: true,
    modelAvailable: true,
    generationAvailable: true,
    quotaAvailable: true,
    affordable: true,
    balance: spendable,
    estimatedCost: selection.estimatedCost,
    model: selection.model,
    reason: null,
    code: null,
  }
}

export async function assertPollinationsVideoAffordable(params: {
  durationSec?: number
  width?: number
  height?: number
  model?: string
  sceneNumber?: number
  forceRefresh?: boolean
}): Promise<{ model: string; estimatedCost: number; balance: number | null }> {
  const durationSec = Math.max(2, Math.min(15, Math.round(params.durationSec ?? 5)))
  const probed = await probePollinationsSpendableBalance({ forceRefresh: params.forceRefresh ?? true })
  const spendable = probed.spendable

  const selection = await selectAffordablePollinationsVideoModel({
    durationSec,
    spendable,
    preferred: params.model,
    width: params.width,
    height: params.height,
  })

  if (spendable != null && spendable <= 0) {
    throw new PollinationsError({
      code: 'POLLINATIONS_CREDITS_EXHAUSTED',
      message: 'Insufficient Pollen balance',
      httpStatus: 402,
      sceneNumber: params.sceneNumber,
      model: selection?.model,
      action: 'Top up pollen at https://enter.pollinations.ai',
    })
  }

  if (!selection) {
    throw new PollinationsError({
      code: 'POLLINATIONS_CREDITS_EXHAUSTED',
      message: 'No affordable Pollinations image-to-video model for current balance',
      httpStatus: 402,
      sceneNumber: params.sceneNumber,
      action: 'Top up pollen at https://enter.pollinations.ai',
    })
  }

  if (spendable != null && selection.estimatedCost > spendable) {
    throw new PollinationsError({
      code: 'POLLINATIONS_CREDITS_EXHAUSTED',
      message: `Insufficient Pollen balance (need ~${selection.estimatedCost.toFixed(4)}, have ${spendable.toFixed(4)})`,
      httpStatus: 402,
      sceneNumber: params.sceneNumber,
      model: selection.model,
      action: 'Top up pollen at https://enter.pollinations.ai',
    })
  }

  console.info('[pollinations] video preflight', {
    model: selection.model,
    balance: spendable,
    estimatedCost: selection.estimatedCost,
    affordable: true,
    authenticated: true,
    durationSec,
    width: params.width ?? null,
    height: params.height ?? null,
  })

  return { model: selection.model, estimatedCost: selection.estimatedCost, balance: spendable }
}
