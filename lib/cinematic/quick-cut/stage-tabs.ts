import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

export type QuickCutStageTab =
  | 'title'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'visuals'
  | 'voice'
  | 'render'
  | 'complete'

export function isQuickCutStageTab(value: string | null | undefined): value is QuickCutStageTab {
  return Boolean(value && STAGE_TAB_ORDER.includes(value as QuickCutStageTab))
}

export const STAGE_TAB_ORDER: QuickCutStageTab[] = [
  'title',
  'hook',
  'script',
  'scenes',
  'visuals',
  'voice',
  'render',
  'complete',
]

export const STAGE_TAB_LABELS: Record<QuickCutStageTab, string> = {
  title: 'Title',
  hook: 'Hook',
  script: 'Script',
  scenes: 'Scenes',
  visuals: 'Visuals',
  voice: 'Voice',
  render: 'Render',
  complete: 'Complete',
}

export function generationStepToTab(
  step: QuickCutGenerationStep
): QuickCutStageTab | null {
  if (step === 'idle' || step === 'error') return null
  if (step === 'analyzing') return 'title'
  if (step === 'images') return 'visuals'
  if (
    step === 'title' ||
    step === 'hook' ||
    step === 'script' ||
    step === 'scenes' ||
    step === 'voice' ||
    step === 'render' ||
    step === 'complete'
  ) {
    return step
  }
  return null
}

function currentTabIndex(generationStep: QuickCutGenerationStep): number {
  const tab = generationStepToTab(generationStep)
  if (!tab) return -1
  return STAGE_TAB_ORDER.indexOf(tab)
}

export function isStageTabReachable(
  tab: QuickCutStageTab,
  generationStep: QuickCutGenerationStep,
  isComplete: boolean
): boolean {
  if (isComplete) return true
  if (generationStep === 'error' || generationStep === 'idle') return false
  const currentIdx = currentTabIndex(generationStep)
  const tabIdx = STAGE_TAB_ORDER.indexOf(tab)
  if (currentIdx < 0 || tabIdx < 0) return false
  return tabIdx <= currentIdx
}

export function isStageTabActive(
  tab: QuickCutStageTab,
  generationStep: QuickCutGenerationStep,
  isComplete: boolean
): boolean {
  if (isComplete) return tab === 'complete'
  const current = generationStepToTab(generationStep)
  return current === tab
}

export function isStageTabDone(
  tab: QuickCutStageTab,
  generationStep: QuickCutGenerationStep,
  isComplete: boolean
): boolean {
  if (isComplete) return tab !== 'complete'
  if (!isStageTabReachable(tab, generationStep, isComplete)) return false
  return !isStageTabActive(tab, generationStep, isComplete)
}
