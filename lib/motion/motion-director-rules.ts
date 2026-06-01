import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import {
  getMotionPreset,
  selectMotionPresetForScene,
  type MotionPresetId,
} from '@/lib/motion/motion-presets'
import type {
  MotionType,
  ParticleType,
  SceneMotion,
  TransitionType,
} from '@/lib/motion/scene-motion-types'
import { DEFAULT_ANIMATION_INTENSITY } from '@/lib/motion/scene-motion-types'

export type MotionDirectorInput = {
  niche?: string
  script?: string
  scene: Pick<
    GeneratedScene,
    | 'id'
    | 'title'
    | 'description'
    | 'visualPrompt'
    | 'cameraAngle'
    | 'movementStyle'
    | 'lightingMood'
    | 'environment'
    | 'duration'
  >
  sceneIndex: number
  totalScenes: number
  mood?: string
  storyBible?: StoryBible | null
  /** When set, blueprint-driven preset wins over generic hints */
  blueprintPresetId?: MotionPresetId | null
}

export type MotionDirectorOutput = {
  motionPreset: MotionPresetId
  cameraMovement: MotionType
  particleEffects: ParticleType
  intensity: number
  transition: TransitionType
  depthEnabled: boolean
  zoomLevel: number
  source: 'rules' | 'openai'
}

const PRESET_MOTION_TYPE: Record<MotionPresetId, MotionType> = {
  push_in: 'push_in',
  pull_out: 'pull_out',
  slow_pan_left: 'pan_left',
  slow_pan_right: 'pan_right',
  documentary_drift: 'static_drift',
  orbit: 'slow_orbit',
  depth_parallax: 'parallax',
  subtle_zoom: 'push_in',
  historical_push_in: 'push_in',
  battle_tracking: 'tracking',
  luxury_reveal: 'pull_out',
  emotional_close_up: 'push_in',
  ancient_civilization: 'parallax',
}

const PRESET_PARTICLES: Partial<Record<MotionPresetId, ParticleType>> = {
  ancient_civilization: 'dust',
  luxury_reveal: 'light_rays',
  battle_tracking: 'fog',
  documentary_drift: 'none',
}

function sceneMoodText(input: MotionDirectorInput): string {
  return [
    input.mood,
    input.storyBible?.mood,
    input.storyBible?.cameraLanguage,
    input.scene.lightingMood,
    input.scene.environment,
    input.scene.description,
    input.scene.visualPrompt,
    input.niche,
    input.script,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function transitionForIndex(index: number, total: number): TransitionType {
  if (index <= 0) return 'fade'
  if (index >= total - 1) return 'fade'
  return index % 3 === 0 ? 'cross_dissolve' : 'fade'
}

function intensityForScene(mood: string, presetId: MotionPresetId): number {
  if (/\b(fire|torch|flame|battle|chaos)\b/.test(mood)) return 38
  if (/\b(intimate|tear|grief|whisper)\b/.test(mood)) return 28
  if (presetId === 'battle_tracking') return 42
  if (presetId === 'ancient_civilization') return 24
  return DEFAULT_ANIMATION_INTENSITY
}

function flickerScene(mood: string): boolean {
  return /\b(fire|torch|flame|candle|ember)\b/.test(mood)
}

export function rulesMotionDirector(input: MotionDirectorInput): MotionDirectorOutput {
  const presetId =
    input.blueprintPresetId ??
    selectMotionPresetForScene(
      input.scene,
      input.sceneIndex,
      input.totalScenes,
      input.storyBible
    )
  const mood = sceneMoodText(input)
  const preset = getMotionPreset(presetId)

  return {
    motionPreset: presetId,
    cameraMovement: PRESET_MOTION_TYPE[presetId] ?? 'static_drift',
    particleEffects: PRESET_PARTICLES[presetId] ?? 'none',
    intensity: intensityForScene(mood, presetId),
    transition: transitionForIndex(input.sceneIndex, input.totalScenes),
    depthEnabled: preset.category === 'parallax' || presetId === 'ancient_civilization',
    zoomLevel: preset.remotionConfig.scaleTo > 1.12 ? 1.08 : 1,
    source: 'rules',
  }
}

export function motionDirectorToSceneMotion(
  output: MotionDirectorOutput,
  flicker?: boolean
): SceneMotion {
  return {
    presetId: output.motionPreset,
    motionType: output.cameraMovement,
    particleType: output.particleEffects,
    transitionType: output.transition,
    depthEnabled: output.depthEnabled,
    animationIntensity: output.intensity,
    zoomLevel: output.zoomLevel,
    source: 'auto',
    params: flicker ? { easing: 'ease-out' } : undefined,
  }
}

export function sceneUsesFlicker(mood: string): boolean {
  return flickerScene(mood)
}
