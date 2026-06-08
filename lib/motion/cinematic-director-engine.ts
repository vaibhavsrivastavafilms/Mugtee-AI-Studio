import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import {
  selectMotionPresetForScene,
  type MotionPresetId,
} from '@/lib/motion/motion-presets'
import type { MotionType, TransitionType } from '@/lib/motion/scene-motion-types'
import { transitionFramesForType } from '@/lib/motion/transition-timing'

export type SceneEmotion = 'emotional' | 'motivational' | 'documentary' | 'neutral' | 'tension'
export type SceneEnergy = 'low' | 'medium' | 'high'
export type NarrativeIntensity = 'soft' | 'moderate' | 'strong'
export type CaptionStyleId = 'creator' | 'documentary' | 'motivational' | 'storytelling'

export type SceneDirectorProfile = {
  emotion: SceneEmotion
  energy: SceneEnergy
  narrativeIntensity: NarrativeIntensity
  motionPreset: MotionPresetId
  motionType: MotionType
  transition: TransitionType
  captionStyle: CaptionStyleId
  animationIntensity: number
  depthEnabled: boolean
  particleType: 'none' | 'dust' | 'fog' | 'light_rays'
}

const TRANSITION_POOL: TransitionType[] = [
  'cross_fade',
  'film_fade',
  'blur_fade',
  'light_leak',
  'push_transition',
  'cinematic_dissolve',
]

function sceneText(input: {
  scene: Pick<GeneratedScene, 'description' | 'visualPrompt' | 'title' | 'lightingMood' | 'environment'>
  mood?: string
  storyBible?: StoryBible | null
  niche?: string
}): string {
  return [
    input.mood,
    input.storyBible?.mood,
    input.storyBible?.cameraLanguage,
    input.niche,
    input.scene.lightingMood,
    input.scene.environment,
    input.scene.description,
    input.scene.visualPrompt,
    input.scene.title,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function detectEmotion(text: string, role: string): SceneEmotion {
  if (/\b(tear|grief|intimate|heart|love|loss|sad)\b/.test(text)) return 'emotional'
  if (/\b(motivat|inspir|power|win|rise|grind|hustle|success)\b/.test(text)) return 'motivational'
  if (/\b(documentary|history|archive|investigat|truth|fact)\b/.test(text)) return 'documentary'
  if (/\b(battle|war|chaos|tension|conflict|danger)\b/.test(text) || role === 'tension') return 'tension'
  return 'neutral'
}

function detectEnergy(text: string, emotion: SceneEmotion): SceneEnergy {
  if (emotion === 'tension' || /\b(fast|dynamic|action|burst)\b/.test(text)) return 'high'
  if (emotion === 'emotional' || emotion === 'documentary') return 'low'
  if (emotion === 'motivational') return 'high'
  return 'medium'
}

function detectIntensity(energy: SceneEnergy, role: string): NarrativeIntensity {
  if (energy === 'high' || role === 'peak' || role === 'hook') return 'strong'
  if (energy === 'low' || role === 'aftertaste') return 'soft'
  return 'moderate'
}

function captionStyleFor(emotion: SceneEmotion): CaptionStyleId {
  if (emotion === 'documentary') return 'documentary'
  if (emotion === 'motivational') return 'motivational'
  if (emotion === 'emotional') return 'storytelling'
  return 'creator'
}

function motionForProfile(
  emotion: SceneEmotion,
  energy: SceneEnergy,
  scene: Pick<GeneratedScene, 'cameraAngle' | 'movementStyle' | 'visualPrompt' | 'description' | 'title'>,
  sceneIndex: number,
  totalScenes: number,
  storyBible?: StoryBible | null
): MotionPresetId {
  if (emotion === 'emotional') return 'emotional_close_up'
  if (emotion === 'motivational' && energy === 'high') return 'depth_push'
  if (emotion === 'documentary') return 'documentary_zoom'
  if (emotion === 'tension') return 'battle_tracking'
  return selectMotionPresetForScene(scene, sceneIndex, totalScenes, storyBible)
}

function motionTypeForPreset(preset: MotionPresetId): MotionType {
  const map: Partial<Record<MotionPresetId, MotionType>> = {
    push_in: 'push_in',
    pull_out: 'pull_out',
    slow_pan_left: 'pan_left',
    slow_pan_right: 'pan_right',
    tilt_up: 'pan_left',
    tilt_down: 'pan_right',
    orbit: 'slow_orbit',
    orbit_light: 'slow_orbit',
    depth_parallax: 'parallax',
    slow_parallax: 'parallax',
    depth_push: 'push_in',
    documentary_zoom: 'push_in',
    documentary_drift: 'static_drift',
    battle_tracking: 'tracking',
    emotional_close_up: 'push_in',
    historical_push_in: 'push_in',
    luxury_reveal: 'pull_out',
    ancient_civilization: 'parallax',
    subtle_zoom: 'push_in',
  }
  return map[preset] ?? 'static_drift'
}

function transitionForProfile(
  emotion: SceneEmotion,
  sceneIndex: number,
  totalScenes: number
): TransitionType {
  if (sceneIndex <= 0) return 'cut'
  if (sceneIndex >= totalScenes - 1) return 'film_fade'
  if (emotion === 'documentary') return 'cinematic_dissolve'
  if (emotion === 'motivational') return 'push_transition'
  if (emotion === 'emotional') return 'blur_fade'
  return TRANSITION_POOL[sceneIndex % TRANSITION_POOL.length]
}

/** Scene intelligence layer — emotion, energy, motion, and transition without UI changes. */
export function analyzeSceneDirector(input: {
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
  niche?: string
  blueprintPresetId?: MotionPresetId | null
}): SceneDirectorProfile {
  const role = scenePacingRole(input.sceneIndex + 1, input.totalScenes)
  const text = sceneText(input)
  const emotion = detectEmotion(text, role)
  const energy = detectEnergy(text, emotion)
  const narrativeIntensity = detectIntensity(energy, role)
  const motionPreset =
    input.blueprintPresetId ??
    motionForProfile(emotion, energy, input.scene, input.sceneIndex, input.totalScenes, input.storyBible)

  const animationIntensity =
    narrativeIntensity === 'strong' ? 38 : narrativeIntensity === 'soft' ? 22 : 28

  return {
    emotion,
    energy,
    narrativeIntensity,
    motionPreset,
    motionType: motionTypeForPreset(motionPreset),
    transition: transitionForProfile(emotion, input.sceneIndex, input.totalScenes),
    captionStyle: captionStyleFor(emotion),
    animationIntensity,
    depthEnabled: motionPreset === 'depth_parallax' || motionPreset === 'slow_parallax' || motionPreset === 'depth_push',
    particleType:
      motionPreset === 'orbit_light' || motionPreset === 'luxury_reveal'
        ? 'light_rays'
        : motionPreset === 'ancient_civilization'
          ? 'dust'
          : emotion === 'tension'
            ? 'fog'
            : 'none',
  }
}

export function directorTransitionFrames(profile: SceneDirectorProfile, sceneIndex: number): number {
  return transitionFramesForType(profile.transition, sceneIndex)
}
