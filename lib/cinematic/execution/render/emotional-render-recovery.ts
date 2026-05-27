import { cinematicRenderFallback } from '@/lib/cinematic/execution/render/cinematic-render-fallback'
import type { RenderProviderResult } from '@/lib/cinematic/execution/render/cinematic-render-provider'

export function recoverEmotionalRender(): RenderProviderResult {
  return cinematicRenderFallback()
}

export function emotionalRenderRecoveryMessage(): string {
  return 'The sequence pauses briefly — your cinematic world remains intact.'
}
