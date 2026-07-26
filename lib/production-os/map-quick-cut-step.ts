import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
// type-only import — safe for store consumers (no runtime cycle)
import type { ProductionOsPhaseId } from '@/lib/production-os/phases'
import {
  PRODUCTION_OS_PROGRESS,
  PRODUCTION_OS_READY_LINE,
  productionOsProgressLine,
} from '@/lib/production-os/progress-copy'

/** Map the live Quick Cut runner onto Production OS phases. */
export function quickCutStepToProductionPhase(
  step: QuickCutGenerationStep
): ProductionOsPhaseId | null {
  switch (step) {
    case 'analyzing':
    case 'title':
      return 'idea_discovery'
    case 'hook':
      return 'creative_direction'
    case 'script':
      return 'script'
    case 'scenes':
      return 'screenplay'
    case 'images':
      return 'image_generation'
    case 'motion':
      return 'animation'
    case 'voice':
      return 'voiceover'
    case 'render':
      return 'rendering'
    case 'complete':
    case 'idle':
    case 'error':
    default:
      return null
  }
}

export function productionOsLabelForQuickCutStep(
  step: QuickCutGenerationStep
): string {
  if (step === 'complete') return PRODUCTION_OS_READY_LINE
  if (step === 'error') return 'Generation paused'
  if (step === 'idle') return ''
  const phase = quickCutStepToProductionPhase(step)
  if (!phase) return PRODUCTION_OS_PROGRESS.idea_discovery
  return productionOsProgressLine(phase)
}
