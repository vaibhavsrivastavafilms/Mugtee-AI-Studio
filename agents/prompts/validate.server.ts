import type { ScenePrompt } from '@/types/v3/production'
import { parseScenePrompt } from '@/agents/prompts/schema'

const REQUIRED_PROMPT_MARKERS = [
  'Camera:',
  'Lens:',
  'Lighting:',
  'Style:',
  'Aspect Ratio:',
  'Location:',
] as const

export type PromptValidationOptions = {
  requiresCharacter: boolean
}

export function validateScenePrompt(
  prompt: ScenePrompt,
  options: PromptValidationOptions
): void {
  parseScenePrompt(prompt)

  for (const marker of REQUIRED_PROMPT_MARKERS) {
    if (!prompt.imagePrompt.includes(marker)) {
      throw new Error(`Scene ${prompt.sceneNumber}: image prompt missing "${marker}"`)
    }
    if (!prompt.videoPrompt.includes(marker)) {
      throw new Error(`Scene ${prompt.sceneNumber}: video prompt missing "${marker}"`)
    }
  }

  if (!prompt.metadata.camera.trim()) {
    throw new Error(`Scene ${prompt.sceneNumber}: metadata.camera is required`)
  }
  if (!prompt.metadata.lens.trim()) {
    throw new Error(`Scene ${prompt.sceneNumber}: metadata.lens is required`)
  }
  if (!prompt.metadata.lighting.trim()) {
    throw new Error(`Scene ${prompt.sceneNumber}: metadata.lighting is required`)
  }
  if (!prompt.metadata.style.trim()) {
    throw new Error(`Scene ${prompt.sceneNumber}: metadata.style is required`)
  }
  if (!prompt.metadata.aspectRatio.trim()) {
    throw new Error(`Scene ${prompt.sceneNumber}: metadata.aspectRatio is required`)
  }
  if (!prompt.metadata.location?.trim()) {
    throw new Error(`Scene ${prompt.sceneNumber}: metadata.location is required`)
  }

  if (options.requiresCharacter) {
    if (!prompt.metadata.characterAppearance?.trim()) {
      throw new Error(`Scene ${prompt.sceneNumber}: character appearance is required`)
    }
    if (!prompt.metadata.characterSeed?.trim()) {
      throw new Error(`Scene ${prompt.sceneNumber}: character seed is required`)
    }
    if (!prompt.imagePrompt.includes('Character:')) {
      throw new Error(`Scene ${prompt.sceneNumber}: image prompt missing "Character:"`)
    }
    if (!prompt.imagePrompt.includes('Seed:')) {
      throw new Error(`Scene ${prompt.sceneNumber}: image prompt missing "Seed:"`)
    }
  }
}

export function validateScenePromptDocument(
  prompts: ScenePrompt[],
  sceneCharacterRequirements: Map<number, boolean>
): void {
  for (const prompt of prompts) {
    validateScenePrompt(prompt, {
      requiresCharacter: sceneCharacterRequirements.get(prompt.sceneNumber) ?? false,
    })
  }
}
