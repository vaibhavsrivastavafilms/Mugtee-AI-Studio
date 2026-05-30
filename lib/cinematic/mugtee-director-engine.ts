import { buildVirloScenesPrompt } from '@/lib/virlo-engine/virlo-prompt'
import type { VirloContext } from '@/lib/virlo-engine/types'
import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { ViralStructureAnalysis } from '@/lib/cinematic/viral-structure'
import {
  buildStoryboardSopSystemAugment,
  buildStoryboardSopPrompt,
} from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'
import {
  sceneVisualDefaults,
  type VisualStyle,
} from '@/lib/cinematic/workflow-state'
import type { DeepResearchPipelineOptions } from '@/types/deep-research'

/**
 * Mugtee Director — converts Virlo viral script into scene beats with camera + lighting.
 * Uses Virlo visual language; locks persisted visualStyle across regenerations.
 */
export type MugteeDirectorPromptOptions = {
  viralStructure?: ViralStructureAnalysis
} & Pick<DeepResearchPipelineOptions, 'researchDocument'>

export function buildMugteeDirectorPrompt(
  ctx: VirloContext,
  script: string,
  visualStyle: VisualStyle,
  language: ProjectLanguage,
  options: MugteeDirectorPromptOptions = {}
): string {
  const { viralStructure, researchDocument } = options

  const styleLock = [
    `LOCKED VISUAL STYLE (metadata layer — apply to cameraAngle, lightingMood, colorPalette, environment, movementStyle):`,
    `- Style label: ${visualStyle.label}`,
    `- Palette: ${visualStyle.palette}`,
    `- Camera language: ${visualStyle.camera}`,
    `- Lighting: ${visualStyle.lighting}`,
    `- Movement: ${visualStyle.movement}`,
    `- Environment: ${visualStyle.environment}`,
    `Do NOT embed style, palette, lighting, or medium words inside imagePrompt — imagePrompt is scene-only per Storyboard SOP.`,
  ].join('\n')

  const storyboardSop = buildStoryboardSopPrompt(script, {
    language,
    sceneTarget: ctx.sceneTarget,
    durationSec: ctx.duration,
    researchDocument,
    retentionMode: true,
  })

  return [
    languageDirective(language),
    buildStoryboardSopSystemAugment(),
    buildVirloScenesPrompt(ctx, script, viralStructure),
    storyboardSop,
    styleLock,
    `Apply locked palette, camera, and lighting to visual metadata fields only — never inside imagePrompt.`,
  ].join('\n\n')
}

export function applyVisualStyleToScene<T extends Record<string, unknown>>(
  scene: T,
  visualStyle: VisualStyle
): T {
  const defaults = sceneVisualDefaults(visualStyle)
  const existingVisual =
    typeof scene.visualPrompt === 'string' ? scene.visualPrompt.trim() : ''
  const existingImage =
    typeof scene.imagePrompt === 'string' ? scene.imagePrompt.trim() : ''

  return {
    ...scene,
    ...defaults,
    // Scene-only imagePrompt from SOP — preserve; style lives in metadata + reference layer
    imagePrompt: existingImage || existingVisual,
    visualPrompt:
      existingVisual ||
      existingImage ||
      `${defaults.environment}. ${defaults.cameraAngle}.`,
  }
}
