/**
 * Production OS V2 — progress from real counters (not fake step buckets).
 */

import {
  PRODUCTION_OS_PHASE_ORDER,
  type ProductionOsPhaseId,
} from '@/lib/production-os/phases'
import { phaseProgressCeiling, phaseProgressFloor } from '@/lib/production-os/v2/events'

export type ProductionOsV2ProgressInput = {
  currentPhase: ProductionOsPhaseId | null
  completedPhases: readonly ProductionOsPhaseId[]
  imagesDone: number
  imagesTotal: number
  animationDone: number
  animationTotal: number
  renderPercent: number | null
  isComplete: boolean
}

/** Weighted progress 0–100. Only hits 100 when isComplete. */
export function computeProductionOsV2Progress(input: ProductionOsV2ProgressInput): number {
  if (input.isComplete) return 100

  const done = new Set(input.completedPhases)
  let score = 0
  const weight = 100 / PRODUCTION_OS_PHASE_ORDER.length

  for (const phase of PRODUCTION_OS_PHASE_ORDER) {
    if (done.has(phase)) {
      score += weight
      continue
    }
    if (phase !== input.currentPhase) continue

    if (phase === 'image_generation' && input.imagesTotal > 0) {
      score += weight * Math.min(1, input.imagesDone / input.imagesTotal)
      continue
    }
    if (phase === 'animation' && input.animationTotal > 0) {
      score += weight * Math.min(1, input.animationDone / input.animationTotal)
      continue
    }
    if (phase === 'rendering' && input.renderPercent != null) {
      score += weight * Math.min(0.99, Math.max(0, input.renderPercent) / 100)
      continue
    }
    score += weight * 0.35
  }

  const floor = input.currentPhase ? phaseProgressFloor(input.currentPhase) : 0
  const ceiling = input.currentPhase ? phaseProgressCeiling(input.currentPhase) : 99
  const blended = Math.max(floor, Math.min(ceiling, Math.round(score)))
  return Math.min(99, Math.max(0, blended))
}
