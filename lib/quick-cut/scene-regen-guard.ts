import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

/** Allow per-scene regen when the scene already has an image — even while later pipeline steps run. */
export function canRegenerateSingleScene(
  state: {
    isGenerating: boolean
    generationStep: QuickCutGenerationStep
    scenes: GeneratedScene[]
  },
  sceneId: string
): boolean {
  if (!sceneId) return false
  const scene = state.scenes.find((s) => s.id === sceneId)
  if (!sceneHasReviewableImage(scene)) return false
  if (!state.isGenerating) return true
  if (state.generationStep === 'render') return false
  return true
}

export function sceneHasReviewableImage(scene: GeneratedScene | undefined): boolean {
  return Boolean(scene?.imageUrl?.trim())
}
