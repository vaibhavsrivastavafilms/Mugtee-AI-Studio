/**
 * Camera Director — every shot gets intentional cinematic motion.
 * Never assigns static / slideshow-like framing.
 */

import type { MotionPresetId } from '@/lib/motion/motion-presets'
import type { SceneMotion, SceneMotionMap } from '@/lib/motion/scene-motion-types'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneProductionUnit } from '@/lib/production-os/v3/types'

const CINEMATIC_SEQUENCE: MotionPresetId[] = [
  'documentary_zoom',
  'push_in',
  'slow_pan_left',
  'depth_parallax',
  'orbit_light',
  'pull_out',
  'slow_pan_right',
  'emotional_close_up',
  'luxury_reveal',
  'depth_push',
]

const TRANSITIONS = [
  'cross_dissolve',
  'film_fade',
  'blur_fade',
  'cinematic_dissolve',
  'light_leak',
] as const

const LENSES = ['24mm', '35mm', '50mm', '85mm', '135mm'] as const
const COMPOSITIONS = ['rule_of_thirds', 'centered', 'leading_lines', 'frame_within_frame'] as const
const FOCUS = ['sharp_subject', 'rack_focus', 'shallow_dof', 'deep_focus'] as const

/** Ban static-looking presets from production exports. */
const FORBIDDEN: Set<string> = new Set(['static_drift'])

export function assignCameraForScene(
  sceneIndex: number,
  scene: Pick<GeneratedScene, 'id' | 'duration' | 'description'>
): NonNullable<SceneProductionUnit['camera']> & {
  presetId: MotionPresetId
  transition: string
  animationIntensity: number
} {
  let presetId = CINEMATIC_SEQUENCE[sceneIndex % CINEMATIC_SEQUENCE.length]!
  if (FORBIDDEN.has(presetId)) presetId = 'push_in'

  const lens = LENSES[sceneIndex % LENSES.length]!
  const composition = COMPOSITIONS[sceneIndex % COMPOSITIONS.length]!
  const focus = FOCUS[sceneIndex % FOCUS.length]!
  const transition = TRANSITIONS[sceneIndex % TRANSITIONS.length]!

  const movement =
    presetId.includes('pan')
      ? 'pan'
      : presetId.includes('orbit')
        ? 'orbit'
        : presetId.includes('pull')
          ? 'pull'
          : presetId.includes('parallax') || presetId.includes('depth')
            ? 'dolly'
            : 'push'

  return {
    lens,
    movement,
    composition,
    focus,
    depth: focus === 'shallow_dof' || focus === 'rack_focus' ? 'shallow' : 'deep',
    presetId,
    transition,
    animationIntensity: 42, // never subtle-static
  }
}

/** Build a full SceneMotionMap so Remotion never falls back to weak motion. */
export function buildCameraDirectedMotionMap(
  scenes: GeneratedScene[]
): SceneMotionMap {
  const map: SceneMotionMap = {}
  scenes.forEach((scene, index) => {
    const cam = assignCameraForScene(index, scene)
    const id = scene.id || `scene-${index + 1}`
    const entry: SceneMotion = {
      presetId: cam.presetId,
      motionType: undefined,
      particleType: index % 3 === 0 ? 'dust' : index % 3 === 1 ? 'light_rays' : 'fog',
      transitionType: cam.transition as SceneMotion['transitionType'],
      depthEnabled: true,
      animationIntensity: cam.animationIntensity,
      zoomLevel: 1.08,
      duration: Math.max(2.5, scene.duration ?? 4),
      source: 'camera_director_v3',
    }
    map[id] = entry
  })
  return map
}

/** Ensure every scene has strong motion — merge over existing map. */
export function ensureCinematicMotionMap(
  scenes: GeneratedScene[],
  existing?: SceneMotionMap | null
): SceneMotionMap {
  const directed = buildCameraDirectedMotionMap(scenes)
  if (!existing) return directed
  const out: SceneMotionMap = { ...directed }
  for (const [id, entry] of Object.entries(existing)) {
    if (entry?.presetId && !FORBIDDEN.has(entry.presetId)) {
      out[id] = {
        ...entry,
        depthEnabled: entry.depthEnabled ?? true,
        animationIntensity: Math.max(36, entry.animationIntensity ?? 36),
        particleType: entry.particleType && entry.particleType !== 'none' ? entry.particleType : 'dust',
        source: entry.source ?? 'camera_director_v3',
      }
    }
  }
  return out
}
