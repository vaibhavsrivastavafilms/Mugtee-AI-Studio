import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

/** Allow timeline edits when scenes exist and MP4 render is not in flight. */
export function canEditTimeline(state: {
  isGenerating: boolean
  generationStep: QuickCutGenerationStep
  scenes: GeneratedScene[]
}): boolean {
  if (state.scenes.length < 1) return false
  if (state.isGenerating && state.generationStep === 'render') return false
  return true
}
