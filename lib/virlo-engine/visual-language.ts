import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { SceneVisualLanguage } from '@/lib/virlo-engine/types'
import type { EmotionalGoal } from '@/lib/virlo-engine/types'
import type { StoryStructureId } from '@/lib/virlo-engine/types'

const CAMERA_POOL = [
  'Extreme close-up',
  'Slow dolly-in medium',
  'Handheld intimate',
  'Locked-off wide',
  'Over-shoulder POV',
  'Low-angle hero',
  'Top-down macro',
  'Rack-focus close',
] as const

const FRAMING_POOL = [
  'Center-weighted symmetry',
  'Rule-of-thirds off-center subject',
  'Negative space left for text-safe crop',
  'Tight crop — chin to forehead',
  'Silhouette against bright edge',
  'Foreground obstruction layer',
  'Vertical leading lines',
  'Shallow DOF isolation',
] as const

const LIGHTING_POOL = [
  'Cool screen-glow contrast',
  'Warm rim, deep shadow fill',
  'Single hard key, no fill',
  'Diffused overcast softness',
  'Golden hour edge light',
  'Neon accent on matte black',
  'Practical lamp warmth',
  'High-key minimal',
] as const

const MOVEMENT_POOL = [
  'Static hold — micro drift only',
  'Slow push-in',
  'Handheld breath',
  'Lateral track',
  'Subtle orbit',
  'Snap zoom on beat',
  'Parallax foreground pass',
  'Locked tripod — cut on motion',
] as const

const COLOR_NOTES = [
  'Deep shadow, gold highlight',
  'Desaturated teal + amber accent',
  'Monochrome with one saturated hue',
  'Warm skin tones, cool background',
  'Crushed blacks, lifted mids',
  'Film grain, muted palette',
  'High contrast noir',
  'Soft pastel bleed',
] as const

const STRUCTURE_CAMERA_BIAS: Partial<Record<StoryStructureId, number>> = {
  'psychological-reveal': 0,
  'documentary-tension': 3,
  'fast-viral-retention': 6,
  'emotional-cinema': 1,
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[Math.abs(index) % arr.length]
}

export function buildSceneVisualLanguage(
  sceneCount: number,
  niche: CinematicNiche,
  structureId: StoryStructureId,
  emotion: EmotionalGoal,
  seed: number
): SceneVisualLanguage[] {
  const bias = STRUCTURE_CAMERA_BIAS[structureId] ?? 0
  const nicheOffset = niche.length + seed

  return Array.from({ length: sceneCount }, (_, i) => {
    const idx = seed + i * 11 + bias + nicheOffset
    const sceneIndex = i + 1
    const escalate =
      sceneIndex === 1
        ? 'Hook frame — immediate visual question.'
        : sceneIndex === sceneCount
          ? 'Landing frame — stillness or return motif.'
          : sceneIndex >= Math.ceil(sceneCount * 0.6)
            ? 'Peak frame — tightest composition.'
            : 'Build frame — widen context or add layer.'

    return {
      sceneIndex,
      camera: `${pick(CAMERA_POOL, idx)} · ${escalate}`,
      framing: pick(FRAMING_POOL, idx + 3),
      lighting: pick(LIGHTING_POOL, idx + emotion.length),
      movement: pick(MOVEMENT_POOL, idx + sceneIndex),
      colorNote: pick(COLOR_NOTES, idx + bias),
    }
  })
}

export function visualLanguagePromptFragment(visuals: SceneVisualLanguage[]): string {
  return visuals
    .map(
      (v) =>
        `Scene ${v.sceneIndex}: camera=${v.camera}; framing=${v.framing}; lighting=${v.lighting}; movement=${v.movement}; palette=${v.colorNote}`
    )
    .join('\n')
}

export function sceneVisualFieldsFromVirlo(
  visual: SceneVisualLanguage
): {
  cameraAngle: string
  lightingMood: string
  environment: string
  colorPalette: string
  movementStyle: string
} {
  return {
    cameraAngle: visual.camera.split(' · ')[0] ?? visual.camera,
    lightingMood: visual.lighting,
    environment: visual.framing,
    colorPalette: visual.colorNote,
    movementStyle: visual.movement,
  }
}
