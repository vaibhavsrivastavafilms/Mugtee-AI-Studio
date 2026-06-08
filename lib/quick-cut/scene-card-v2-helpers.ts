import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import { emotionalTransitionMotion } from '@/lib/cinematic/motion/emotional-transition-motion'
import { motionPresetLabel } from '@/lib/motion/motion-presets'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import type { MugteeScriptBeat } from '@/lib/cinematic/script-sop'

export type SceneCardStatus = 'pending' | 'generating' | 'ready'

export const SCENE_PROMPT_DIRECTION_CHIPS = [
  'More cinematic',
  'More realistic',
  'Documentary style',
  'Golden hour',
  'Vintage film',
] as const

export function buildEnhancedScenePrompt(
  original: string,
  additional: string,
  chips: string[]
): string {
  const parts = [original.trim(), ...chips.map((c) => c.trim()).filter(Boolean), additional.trim()].filter(
    Boolean
  )
  return parts.join('. ')
}

export function resolveSceneScriptText(
  scene: GeneratedScene,
  index: number,
  scriptBeats?: MugteeScriptBeat[]
): string {
  const beat = scriptBeats?.[index]
  if (beat?.narration?.trim()) return beat.narration.trim()
  return scene.description?.trim() || scene.visualPrompt?.trim() || ''
}

export function formatTransitionLabel(transition?: string | null): string {
  if (!transition?.trim()) return 'Fade'
  return transition
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function resolveSceneTransition(
  sceneId: string,
  index: number,
  totalScenes: number,
  sceneMotion: SceneMotionMap
): string {
  const entry = sceneMotion[sceneId]
  if (entry?.transitionType) return formatTransitionLabel(entry.transitionType)
  if (index < totalScenes) {
    return emotionalTransitionMotion(index + 1, index + 2, totalScenes).motionCue
  }
  return 'Cut'
}

export type SceneDirectorNotes = {
  emotion: string
  narrativeRole: string
  motionRecommendation: string
  transitionRecommendation: string
}

export function resolveSceneDirectorNotes(
  scene: GeneratedScene,
  index: number,
  totalScenes: number,
  sceneBlueprints: SceneBlueprint[],
  sceneMotion: SceneMotionMap
): SceneDirectorNotes {
  const blueprint = sceneBlueprints.find((b) => b.sceneId === scene.id)
  const narrativeRole =
    blueprint?.narrativeGoal?.trim() ||
    scenePacingRole(index + 1, totalScenes || 1)
  const emotion =
    blueprint?.emotion?.trim() ||
    scene.lightingMood?.trim() ||
    'Engaged'
  const motionRecommendation =
    blueprint?.movementStyle?.trim() ||
    (scene.motionPresetId ? motionPresetLabel(scene.motionPresetId) : scene.movementStyle?.trim()) ||
    'Cinematic drift'
  const transitionRecommendation = resolveSceneTransition(scene.id, index + 1, totalScenes, sceneMotion)

  return {
    emotion,
    narrativeRole,
    motionRecommendation,
    transitionRecommendation,
  }
}

export function resolveSceneCardStatus(input: {
  scene?: GeneratedScene | null
  index: number
  completedImageCount: number
  currentSceneIndex: number
  isStoryboardActive: boolean
  isRegenerating: boolean
}): SceneCardStatus {
  const { scene, index, completedImageCount, currentSceneIndex, isStoryboardActive, isRegenerating } =
    input
  if (!scene) return 'pending'
  if (scene.imageUrl?.trim()) return 'ready'
  if (isRegenerating) return 'generating'
  if (isStoryboardActive && index + 1 === currentSceneIndex) return 'generating'
  if (isStoryboardActive && index < completedImageCount) return 'generating'
  return 'pending'
}
