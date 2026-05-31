import {
  getMotionPreset,
  type MotionPresetId,
  type RemotionMotionConfig,
} from '@/lib/motion/motion-presets'
import type { SceneMotion, SceneMotionMap } from '@/lib/motion/scene-motion-types'
import { DEFAULT_ANIMATION_INTENSITY } from '@/lib/motion/scene-motion-types'
import type { ReelSceneInput, ReelSceneMotionConfig } from '@/lib/remotion/compositions/types'
import type { GeneratedScene } from '@/lib/cinematic/generation'

function mergeMotionConfig(
  base: RemotionMotionConfig,
  overrides?: Partial<RemotionMotionConfig>,
  zoomLevel?: number
): RemotionMotionConfig {
  let merged = overrides ? { ...base, ...overrides } : { ...base }
  if (zoomLevel && zoomLevel !== 1) {
    const boost = (zoomLevel - 1) * 0.12
    merged = {
      ...merged,
      scaleTo: merged.scaleTo + boost,
      scaleFrom: merged.scaleFrom + boost * 0.25,
    }
  }
  return merged
}

export function remotionConfigForEntry(entry: SceneMotion): ReelSceneMotionConfig {
  const preset = getMotionPreset(entry.presetId)
  const merged = mergeMotionConfig(preset.remotionConfig, entry.params, entry.zoomLevel)
  return {
    presetId: entry.presetId,
    motionType: entry.motionType,
    ...merged,
    parallaxOffset:
      entry.depthEnabled === false
        ? 0
        : merged.parallaxOffset ?? (preset.category === 'parallax' ? 18 : 0),
    depthEnabled: entry.depthEnabled ?? preset.category === 'parallax',
    particleType: entry.particleType ?? 'none',
    transitionType: entry.transitionType ?? 'fade',
    animationIntensity: entry.animationIntensity ?? DEFAULT_ANIMATION_INTENSITY,
    flicker: (entry.animationIntensity ?? DEFAULT_ANIMATION_INTENSITY) > 34,
    easing: merged.easing,
  }
}

export function remotionConfigForScene(
  scene: Pick<GeneratedScene, 'id' | 'motionPresetId' | 'motionParams'>,
  sceneIndex: number,
  sceneMotion?: SceneMotionMap | null
): ReelSceneMotionConfig | undefined {
  const sceneId = scene.id || `scene-${sceneIndex + 1}`
  const fromMap = sceneMotion?.[sceneId]
  const presetId = fromMap?.presetId ?? scene.motionPresetId ?? undefined

  if (!presetId) return undefined

  const entry: SceneMotion = {
    presetId,
    params: fromMap?.params ?? scene.motionParams,
    source: fromMap?.source,
    motionType: fromMap?.motionType,
    particleType: fromMap?.particleType,
    transitionType: fromMap?.transitionType,
    depthEnabled: fromMap?.depthEnabled,
    animationIntensity: fromMap?.animationIntensity,
    zoomLevel: fromMap?.zoomLevel,
  }
  return remotionConfigForEntry(entry)
}

/** Map legacy motion slug to preset id for backward compatibility. */
export function legacyMotionToPresetId(
  motion: ReelSceneInput['motion']
): MotionPresetId | null {
  switch (motion) {
    case 'zoom-in':
      return 'push_in'
    case 'zoom-out':
      return 'pull_out'
    case 'pan-left':
      return 'slow_pan_left'
    case 'pan-right':
      return 'slow_pan_right'
    default:
      return null
  }
}

export function resolveSceneMotionConfig(
  scene: Pick<GeneratedScene, 'id' | 'motionPresetId' | 'motionParams'> & {
    motion?: ReelSceneInput['motion']
    lightingMood?: string
    environment?: string
    description?: string
  },
  sceneIndex: number,
  sceneMotion?: SceneMotionMap | null
): ReelSceneMotionConfig {
  const fromPreset = remotionConfigForScene(scene, sceneIndex, sceneMotion)
  if (fromPreset) return fromPreset

  const legacyId = scene.motion ? legacyMotionToPresetId(scene.motion) : null
  if (legacyId) {
    return remotionConfigForEntry({ presetId: legacyId })
  }

  const fallback =
    sceneIndex % 2 === 0 ? ('push_in' as MotionPresetId) : ('slow_pan_right' as MotionPresetId)
  return remotionConfigForEntry({ presetId: fallback })
}

export function buildReelSceneInput(
  scene: GeneratedScene,
  sceneIndex: number,
  input: {
    imageSrc: string
    caption?: string
    sceneMotion?: SceneMotionMap | null
    totalScenes?: number
  }
): ReelSceneInput {
  const motionConfig = resolveSceneMotionConfig(scene, sceneIndex, input.sceneMotion)
  const entry = input.sceneMotion?.[scene.id || `scene-${sceneIndex + 1}`]
  const durationSec = Math.max(2, entry?.duration ?? scene.duration ?? 4)

  return {
    id: scene.id || `scene-${sceneIndex}`,
    imageSrc: input.imageSrc,
    durationSec,
    caption: input.caption ?? '',
    motionConfig,
  }
}
