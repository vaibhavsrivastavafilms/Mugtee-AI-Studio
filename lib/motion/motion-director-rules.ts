import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import {
  getMotionPreset,
  type MotionPresetId,
} from '@/lib/motion/motion-presets'
import type {
  MotionType,
  ParticleType,
  SceneMotion,
  TransitionType,
} from '@/lib/motion/scene-motion-types'
import { DEFAULT_ANIMATION_INTENSITY } from '@/lib/motion/scene-motion-types'
import { analyzeSceneDirector } from '@/lib/motion/cinematic-director-engine'

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
  captionStyle?: 'creator' | 'documentary' | 'motivational' | 'storytelling'
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

function flickerScene(mood: string): boolean {
  return /\b(fire|torch|flame|candle|ember)\b/.test(mood)
}

export function rulesMotionDirector(input: MotionDirectorInput): MotionDirectorOutput {
  const profile = analyzeSceneDirector({
    scene: input.scene,
    sceneIndex: input.sceneIndex,
    totalScenes: input.totalScenes,
    mood: input.mood,
    storyBible: input.storyBible,
    niche: input.niche,
    blueprintPresetId: input.blueprintPresetId,
  })
  const preset = getMotionPreset(profile.motionPreset)
  const mood = sceneMoodText(input)

  return {
    motionPreset: profile.motionPreset,
    cameraMovement: profile.motionType,
    particleEffects: profile.particleType,
    intensity: profile.animationIntensity,
    transition: profile.transition,
    depthEnabled: profile.depthEnabled || preset.category === 'parallax',
    zoomLevel: preset.remotionConfig.scaleTo > 1.12 ? 1.08 : 1,
    source: 'rules',
    captionStyle: profile.captionStyle,
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
    animationIntensity: output.intensity ?? DEFAULT_ANIMATION_INTENSITY,
    zoomLevel: output.zoomLevel,
    source: 'auto',
    params: flicker ? { easing: 'ease-out' } : undefined,
  }
}

export function sceneUsesFlicker(mood: string): boolean {
  return flickerScene(mood)
}
