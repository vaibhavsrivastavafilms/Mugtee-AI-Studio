export function parsePollinationsPaymentRequired(body: string): {
  availableBalance: number | null
  estimatedCost: number | null
} {
  const availableMatch = /available balance is\s+([0-9]+(?:\.[0-9]+)?)/i.exec(body)
  const costMatch = /costs?\s+~?\s*([0-9]+(?:\.[0-9]+)?)\s+pollen/i.exec(body)
  return {
    availableBalance: availableMatch ? Number(availableMatch[1]) : null,
    estimatedCost: costMatch ? Number(costMatch[1]) : null,
  }
}

export type PollinationsModelPricing = {
  pollenCost: number
}

export function estimatePollenCostForVideo(
  model: PollinationsModelPricing,
  durationSec: number
): number {
  const seconds = Math.max(1, Math.round(durationSec))
  const perSecond = model.pollenCost > 0 ? model.pollenCost : 0
  return perSecond * seconds
}

export function estimatePollenCostForImage(model: PollinationsModelPricing): number {
  return model.pollenCost > 0 ? model.pollenCost : 0.004
}

const POLLINATIONS_CREDIT_CODES = new Set([
  'POLLINATIONS_CREDITS_REQUIRED',
  'POLLINATIONS_CREDITS_EXHAUSTED',
])

/**
 * Image generation is ready only when authenticated, a model exists,
 * and spendable Pollen is not exhausted. Auth + catalog alone is not enough.
 */
export function isPollinationsImageReady(params: {
  imageModel: string | null | undefined
  authenticated: boolean
  balance?: number | null
  code?: string | null
}): boolean {
  if (!params.authenticated) return false
  if (!params.imageModel?.trim()) return false
  if (params.code && POLLINATIONS_CREDIT_CODES.has(params.code)) return false
  if (params.balance != null && params.balance <= 0) return false
  return true
}
