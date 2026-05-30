import { buildVirloScenesPrompt } from '@/lib/virlo-engine/virlo-prompt'
import type { VirloContext } from '@/lib/virlo-engine/types'
import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { ViralStructureAnalysis } from '@/lib/cinematic/viral-structure'
import {
  sceneVisualDefaults,
  type VisualStyle,
} from '@/lib/cinematic/workflow-state'

/**
 * Mugtee Director — converts Virlo viral script into scene beats with camera + lighting.
 * Uses Virlo visual language; locks persisted visualStyle across regenerations.
 */
export function buildMugteeDirectorPrompt(
  ctx: VirloContext,
  script: string,
  visualStyle: VisualStyle,
  language: ProjectLanguage,
  viralStructure?: ViralStructureAnalysis
): string {
  const styleLock = [
    `LOCKED VISUAL STYLE (preserve across all scenes — do NOT revert to generic luxury/gold unless listed below):`,
    `- Style label: ${visualStyle.label}`,
    `- Palette: ${visualStyle.palette}`,
    `- Camera language: ${visualStyle.camera}`,
    `- Lighting: ${visualStyle.lighting}`,
    `- Movement: ${visualStyle.movement}`,
    `- Environment: ${visualStyle.environment}`,
  ].join('\n')

  return [
    languageDirective(language),
    buildVirloScenesPrompt(ctx, script, viralStructure),
    styleLock,
    `Apply the locked palette, camera, and lighting to every scene's visual fields.`,
  ].join('\n\n')
}

export function applyVisualStyleToScene<T extends Record<string, unknown>>(
  scene: T,
  visualStyle: VisualStyle
): T {
  const defaults = sceneVisualDefaults(visualStyle)
  return {
    ...scene,
    ...defaults,
    visualPrompt:
      typeof scene.visualPrompt === 'string' && scene.visualPrompt.trim()
        ? scene.visualPrompt
        : `${visualStyle.label}. ${defaults.cameraAngle}. ${defaults.environment}. ${defaults.colorPalette}.`,
  }
}
