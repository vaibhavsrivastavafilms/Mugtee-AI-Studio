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
    const withEscalation = applyEscalationToScene(scene, memory, i + 1, harmonized.length)
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

export function cameraDirectionForRole(role: string, sceneIndex = 1): string {
  const variants: Record<string, string[]> = {
    hook: [
      'pattern interrupt — detail or off-center portrait',
      'visual question — tight detail before context',
    ],
    tension: [
      'handheld drift, motivated movement',
      'medium close — subject slightly off-axis',
    ],
    peak: [
      'slow push-in or locked intimate frame',
      'shallow depth — subject at emotional center',
    ],
    release: [
      'controlled pull-back, breathing room',
      'wider frame — context returns gently',
    ],
    aftertaste: [
      'stillness — hold on emotional residue',
      'minimal movement — memory lingers',
    ],
  }
  const pool = variants[role] ?? ['motivated cinematic framing']
  return pool[(sceneIndex - 1) % pool.length]
}
