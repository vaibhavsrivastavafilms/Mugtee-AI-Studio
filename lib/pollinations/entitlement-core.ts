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
