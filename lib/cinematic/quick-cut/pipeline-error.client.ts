import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { isReelExportNoticeMessage } from '@/lib/video/reel-render-errors'

type PipelineErrorContext = {
  isGenerating: boolean
  generationStep: QuickCutGenerationStep
  hasExportContext?: boolean
}

/**
 * Pipeline `error` for Ask Mugtee / create canvas — only while generation is active
 * or a non-export failure paused the run. Export notices belong on export UI.
 */
export function resolveActivePipelineError(
  error: string | null | undefined,
  ctx: PipelineErrorContext
): string | null {
  if (!error?.trim()) return null

  const activePipeline =
    ctx.isGenerating || ctx.generationStep === 'error' || ctx.generationStep === 'render'

  if (!activePipeline) return null

  if (
    isReelExportNoticeMessage(error) &&
    !ctx.hasExportContext &&
    ctx.generationStep !== 'render'
  ) {
    return null
  }

  return error.trim()
}

/** Clear stale export errors when the create canvas is idle (no export attempted). */
export function shouldClearIdleExportErrors(state: {
  isGenerating: boolean
  isComplete: boolean
  generationStep: QuickCutGenerationStep
  renderPollUrl: string | null
  isRenderingVideo: boolean
  prompt: string
  scenes: unknown[]
}): boolean {
  if (state.isGenerating || state.isComplete) return false
  if (state.renderPollUrl || state.isRenderingVideo) return false
  if (state.generationStep === 'render') return false
  if (state.prompt.trim().length >= 6 || state.scenes.length > 0) return false
  return true
}
