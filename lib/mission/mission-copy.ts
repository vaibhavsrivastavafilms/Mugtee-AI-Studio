import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { productionOsLabelForQuickCutStep } from '@/lib/production-os/map-quick-cut-step'
import { PRODUCTION_OS_READY_LINE } from '@/lib/production-os/progress-copy'

/** Mission-style loading copy — Production OS creative progress. */
export const MISSION_STEP_LABELS: Record<QuickCutGenerationStep, string> = {
  idle: '',
  analyzing: productionOsLabelForQuickCutStep('analyzing'),
  title: productionOsLabelForQuickCutStep('title'),
  hook: productionOsLabelForQuickCutStep('hook'),
  script: productionOsLabelForQuickCutStep('script'),
  scenes: productionOsLabelForQuickCutStep('scenes'),
  images: productionOsLabelForQuickCutStep('images'),
  motion: productionOsLabelForQuickCutStep('motion'),
  voice: productionOsLabelForQuickCutStep('voice'),
  render: productionOsLabelForQuickCutStep('render'),
  complete: PRODUCTION_OS_READY_LINE,
  error: 'Generation paused',
}

export function missionStatusLabel(
  step?: QuickCutGenerationStep,
  _sceneCount = 0,
  directingLabel?: string | null
): string {
  if (directingLabel) return directingLabel
  if (!step || step === 'idle') return productionOsLabelForQuickCutStep('script')
  return MISSION_STEP_LABELS[step] || productionOsLabelForQuickCutStep('script')
}
