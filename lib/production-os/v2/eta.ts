/**
 * Production OS V2 — real ETA. Never display "Calculating…".
 */

import { formatEtaLabel } from '@/lib/generation/generation-eta'
import {
  PRODUCTION_OS_PHASE_ORDER,
  type ProductionOsPhaseId,
} from '@/lib/production-os/phases'

/** Default phase durations (seconds) — refined by live averages when available. */
export const DEFAULT_PHASE_DURATION_SEC: Record<ProductionOsPhaseId, number> = {
  idea_discovery: 4,
  deep_research: 6,
  creative_direction: 5,
  script: 12,
  screenplay: 8,
  storyboard: 10,
  shot_list: 4,
  voiceover: 16,
  image_generation: 45,
  animation: 40,
  video_editing: 8,
  music: 6,
  sound_design: 4,
  captions: 4,
  rendering: 90,
}

export type ProductionOsV2EtaInput = {
  currentPhase: ProductionOsPhaseId | null
  completedPhases: readonly ProductionOsPhaseId[]
  phaseStartedAtMs: number | null
  sceneCount: number
  imagesDone: number
  imagesTotal: number
  animationDone: number
  animationTotal: number
  /** Remotion / FFmpeg 0–100 when rendering. */
  renderPercent: number | null
  renderStartedAtMs: number | null
  isComplete: boolean
  /** Optional learned averages (ms). */
  phaseAveragesMs?: Partial<Record<ProductionOsPhaseId, number>>
}

export type ProductionOsV2EtaResult = {
  remainingSec: number
  /** Always a human label — never null while in progress. */
  label: string
  display: string
}

function phaseSeconds(
  phase: ProductionOsPhaseId,
  sceneCount: number,
  averages?: Partial<Record<ProductionOsPhaseId, number>>
): number {
  const learned = averages?.[phase]
  if (learned && learned > 0) return Math.max(1, Math.ceil(learned / 1000))
  let base = DEFAULT_PHASE_DURATION_SEC[phase]
  if (phase === 'image_generation' && sceneCount > 0) {
    base = Math.max(12, Math.round(8 * sceneCount))
  }
  if (phase === 'animation' && sceneCount > 0) {
    base = Math.max(10, Math.round(6 * sceneCount))
  }
  return base
}

function exportRemainingSec(renderPercent: number, startedAt: number): number {
  const clamped = Math.max(1, Math.min(99, Math.round(renderPercent)))
  const elapsed = Date.now() - startedAt
  if (elapsed < 800 || clamped < 2) {
    return Math.max(15, Math.ceil((100 - clamped) * 1.2))
  }
  const rate = clamped / elapsed
  if (rate <= 0) return 30
  return Math.max(1, Math.ceil((100 - clamped) / rate / 1000))
}

export function computeProductionOsV2Eta(input: ProductionOsV2EtaInput): ProductionOsV2EtaResult {
  if (input.isComplete) {
    return { remainingSec: 0, label: 'Done', display: 'Done' }
  }

  if (
    input.currentPhase === 'rendering' &&
    input.renderPercent != null &&
    input.renderStartedAtMs
  ) {
    const remainingSec = exportRemainingSec(input.renderPercent, input.renderStartedAtMs)
    const label = formatEtaLabel(remainingSec)
    return {
      remainingSec,
      label,
      display: `Estimated Time Remaining ${label}`,
    }
  }

  const done = new Set(input.completedPhases)
  let remainingMs = 0
  let foundCurrent = false

  for (const phase of PRODUCTION_OS_PHASE_ORDER) {
    if (done.has(phase)) continue
    const fullSec = phaseSeconds(phase, input.sceneCount, input.phaseAveragesMs)

    if (phase === input.currentPhase) {
      foundCurrent = true
      const started = input.phaseStartedAtMs ?? Date.now()
      const elapsedSec = Math.max(0, (Date.now() - started) / 1000)

      if (phase === 'image_generation' && input.imagesTotal > 0) {
        const left = Math.max(0, input.imagesTotal - input.imagesDone)
        const per = fullSec / input.imagesTotal
        remainingMs += left * per * 1000
        continue
      }
      if (phase === 'animation' && input.animationTotal > 0) {
        const left = Math.max(0, input.animationTotal - input.animationDone)
        const per = fullSec / input.animationTotal
        remainingMs += left * per * 1000
        continue
      }

      remainingMs += Math.max(0, fullSec - elapsedSec) * 1000
      continue
    }

    if (foundCurrent || !input.currentPhase) {
      remainingMs += fullSec * 1000
    }
  }

  // Floor so UI never shows "Calculating…"
  const remainingSec = Math.max(8, Math.ceil(remainingMs / 1000))
  const label = formatEtaLabel(remainingSec)
  return {
    remainingSec,
    label,
    display: `Estimated Time Remaining ${label}`,
  }
}

/** Map Quick Cut step → Production OS phase for ETA. */
export function quickCutStepToEtaPhase(
  step: string
): ProductionOsPhaseId | null {
  switch (step) {
    case 'analyzing':
    case 'title':
    case 'hook':
      return 'idea_discovery'
    case 'script':
      return 'script'
    case 'scenes':
      return 'screenplay'
    case 'images':
      return 'image_generation'
    case 'voice':
      return 'voiceover'
    case 'motion':
      return 'animation'
    case 'render':
      return 'rendering'
    case 'complete':
      return null
    default:
      return 'creative_direction'
  }
}
