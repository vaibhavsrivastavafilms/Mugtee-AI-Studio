export {
  MOTION_PRESET_LIST,
  assignSceneMotion,
  applySceneMotionToScenes,
  getMotionPreset,
  isMotionPresetId,
  motionPresetLabel,
  parseSceneMotionMap,
  selectMotionPresetForScene,
  type MotionPreset,
  type MotionPresetId,
  type RemotionMotionConfig,
  type SceneMotionEntry,
  type SceneMotionSource,
} from '@/lib/motion/motion-presets'

export type {
  MotionType,
  ParticleType,
  SceneMotion,
  SceneMotionMap,
  TransitionType,
} from '@/lib/motion/scene-motion-types'

export {
  buildParallaxLayers,
  parallaxLayerStyle,
  type ParallaxLayerSpec,
} from '@/lib/motion/parallax-layers'

export { microAnimationAtFrame, DEFAULT_ANIMATION_INTENSITY } from '@/lib/motion/micro-animation'

export {
  rulesMotionDirector,
  motionDirectorToSceneMotion,
  type MotionDirectorInput,
  type MotionDirectorOutput,
} from '@/lib/motion/motion-director-rules'

export {
  buildReelSceneInput,
  remotionConfigForEntry,
  remotionConfigForScene,
  resolveSceneMotionConfig,
} from '@/lib/motion/apply-scene-motion'
