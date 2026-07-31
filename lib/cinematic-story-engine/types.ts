/**
 * Cinematic Story Engine — automatic idea → film intelligence package.
 * Creator never writes prompts or splits scenes manually.
 */

import type { CharacterBible } from '@/lib/production-os/v4/character-bible'
import type { EnvironmentBible } from '@/lib/production-os/v4/environment-bible'

export type StoryUnderstanding = {
  idea: string
  genre: string
  emotion: string
  audience: string
  language: string
  platform: string
  lengthSec: number
  characters: string[]
  setting: string
  conflict: string
  ending: string
}

export type StoryBeatId =
  | 'beginning'
  | 'conflict'
  | 'journey'
  | 'climax'
  | 'resolution'

export type StoryStructure = {
  beginning: string
  conflict: string
  journey: string
  climax: string
  resolution: string
}

export type ScreenplayScene = {
  sceneNumber: number
  durationSec: number
  location: string
  characters: string[]
  dialogue: string
  narration: string
  cameraDirection: string
  lighting: string
  emotion: string
  transition: string
  beat: StoryBeatId
}

export type SceneProductionPrompt = {
  sceneNumber: number
  prompt: string
  negativePrompt: string
  animationInstructions: string
  camera: string
  lens: string
  composition: string
  lighting: string
  movement: string
  emotion: string
  style: string
}

export type CinematicStoryPackage = {
  version: 'cinematic-story-engine-v1'
  understanding: StoryUnderstanding
  structure: StoryStructure
  screenplay: ScreenplayScene[]
  characterBible: CharacterBible
  environmentBible: EnvironmentBible
  scenePrompts: SceneProductionPrompt[]
  thinkingLine: string
  createdAt: string
}
