import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

export type DirectorCommentaryInput = {
  generationStep: QuickCutGenerationStep
  sectionStatus: SectionStatusMap
  directingSceneLabel: string | null
  hookProgressLabel: string | null
  isRenderingVideo: boolean
  renderStatusLabel: string | null
  scenesCount: number
  scenesWithImages: number
}

/** Live director commentary from pipeline state — no fake rotation. */
export function resolveDirectorCommentary(input: DirectorCommentaryInput): string | null {
  if (input.directingSceneLabel?.trim()) return input.directingSceneLabel.trim()
  if (input.hookProgressLabel?.trim()) return input.hookProgressLabel.trim()
  if (input.renderStatusLabel?.trim() && input.isRenderingVideo) {
    return input.renderStatusLabel.trim()
  }

  if (input.sectionStatus.hook === 'generating' || input.generationStep === 'hook') {
    return 'Building emotional opening sequence…'
  }
  if (input.sectionStatus.script === 'generating' || input.generationStep === 'script') {
    return 'Crafting narrative arc and retention beats…'
  }
  if (input.sectionStatus.visualDirection === 'generating' || input.generationStep === 'scenes') {
    return 'Designing visual contrast across scenes…'
  }
  if (input.sectionStatus.storyboard === 'generating' || input.generationStep === 'images') {
    const n = Math.max(1, input.scenesWithImages + 1)
    return `Generating climax scene ${n} of ${Math.max(input.scenesCount, n)}…`
  }
  if (input.generationStep === 'motion') {
    return 'Applying cinematic motion plan…'
  }
  if (input.sectionStatus.voice === 'generating' || input.generationStep === 'voice') {
    return 'Creating voiceover with natural pacing…'
  }
  if (input.isRenderingVideo || input.generationStep === 'render') {
    return 'Preparing final export package…'
  }
  if (input.sectionStatus.captions === 'generating') {
    return 'Generating captions for retention…'
  }

  return null
}
