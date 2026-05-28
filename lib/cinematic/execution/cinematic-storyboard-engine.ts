import type { CinematicNiche } from '@/lib/cinematic/niches'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  buildContinuityContext,
  buildContinuityPromptBlock,
  harmonizeSceneVisuals,
} from '@/lib/cinematic/execution/visual-continuity-system'
import { nextShotSuggestion, buildShotMemory } from '@/lib/cinematic/execution/cinematic-shot-memory'
import {
  applyEscalationToScene,
  buildShotEscalationMemory,
} from '@/lib/cinematic/storyboard/shot-escalation-memory'
import {
  cameraLanguageForSceneIndex,
  formatCameraLanguageBlock,
} from '@/lib/cinematic/storyboard/emotional-camera-language'

export function enhanceStoryboardScenes(
  scenes: GeneratedScene[],
  niche: CinematicNiche
): GeneratedScene[] {
  const harmonized = harmonizeSceneVisuals(scenes, niche)
  return harmonized.map((scene, i) => {
    const memory = buildShotEscalationMemory(harmonized, i)
    const withEscalation = applyEscalationToScene(scene, memory)
    if (withEscalation.cameraAngle.trim()) return withEscalation
    const cue = cameraLanguageForSceneIndex(i + 1, harmonized.length)
    return {
      ...withEscalation,
      cameraAngle: formatCameraLanguageBlock(cue),
    }
  })
}

export function buildStoryboardContinuityBlock(
  scenes: GeneratedScene[],
  sceneIndex: number,
  niche: CinematicNiche
): string {
  const ctx = buildContinuityContext(scenes, sceneIndex, niche)
  const block = buildContinuityPromptBlock(ctx)
  const memory = buildShotMemory(scenes)
  const suggestion = nextShotSuggestion(memory, sceneIndex)
  const role = scenePacingRole(sceneIndex, scenes.length || 1)

  return [
    block,
    `Shot flow (${role}): ${suggestion}.`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function cameraDirectionForRole(role: string): string {
  const map: Record<string, string> = {
    hook: 'pattern interrupt — detail or off-center portrait',
    tension: 'handheld drift, motivated movement',
    peak: 'slow push-in or locked intimate frame',
    release: 'controlled pull-back, breathing room',
    aftertaste: 'stillness — hold on emotional residue',
  }
  return map[role] ?? 'motivated cinematic framing'
}
