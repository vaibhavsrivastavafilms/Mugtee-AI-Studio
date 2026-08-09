import 'server-only'

import { aspectRatioToDimensions } from '@/agents/image/schema'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V3AspectRatio } from '@/types/v3/production'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import {
  buildV7SceneImagePromptFromSpec,
  buildV7SceneImageSpec,
  scoreV7SceneImagePrompt,
  validateV7SceneImagePrompt,
  type V7SceneImagePromptPackage,
  type V7SceneImageSpec,
} from '@/lib/v7/image-prompt-spec.core'

export type V7ScenePromptBundle = {
  sceneNumber: number
  sceneId: string
  prompt: string
  negativePrompt: string
  seed: number
  aspectRatio: V3AspectRatio
  width: number
  height: number
  promptArchive: Record<string, unknown>
  consistencyModes: Array<'instantid' | 'ip-adapter' | 'pulid' | 'controlnet' | 'prompt'>
  spec: V7SceneImageSpec
  promptScore: number
}

function deriveProductionSeed(productionId: string): number {
  let hash = 2_147_483_647
  for (const char of productionId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash % 2_000_000_000
}

export function buildV7ScenePromptBundles(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number }>
  productionId: string
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
}): V7ScenePromptBundle[] {
  const aspectRatio = (params.brief.aspectRatio ?? '9:16') as V3AspectRatio
  const { width, height } = aspectRatioToDimensions(aspectRatio)
  const baseSeed = deriveProductionSeed(params.productionId)

  return params.scenes
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((scene) => {
      const scriptScene = params.script.scenes.find((entry) => entry.number === scene.number)
      const board = params.storyboard.scenes.find((entry) => entry.number === scene.number)
      const shot = board?.shots?.[0]

      const spec = buildV7SceneImageSpec({
        sceneNumber: scene.number,
        sceneId: scene.id,
        productionId: params.productionId,
        scriptScene,
        shot,
        brief: params.brief,
        direction: params.direction,
        characterBible: params.characterBible,
        worldBible: params.worldBible,
      })

      const { prompt, negativePrompt } = buildV7SceneImagePromptFromSpec({
        spec,
        aspectRatio,
        characterBible: params.characterBible,
        worldBible: params.worldBible,
        narration: scriptScene?.narration,
        emotion: shot?.emotion ?? scriptScene?.emotion,
        lens: shot?.lens,
        movement: shot?.movement ?? scriptScene?.movement,
      })

      const score = scoreV7SceneImagePrompt({
        spec,
        prompt,
        negativePrompt,
        characterBible: params.characterBible,
      })

      return {
        sceneNumber: scene.number,
        sceneId: scene.id,
        prompt,
        negativePrompt,
        seed: baseSeed + scene.number * 10_007,
        aspectRatio,
        width,
        height,
        consistencyModes: ['prompt'] as const,
        spec,
        promptScore: score.overall,
        promptArchive: {
          sceneNumber: scene.number,
          continuityId: spec.continuity,
          purpose: spec.purpose,
          subject: spec.subject,
          action: spec.action,
          location: spec.location,
          characters: spec.characters,
          objects: spec.objects,
          forbiddenElements: spec.forbiddenElements,
          requiredPromptTerms: spec.requiredPromptTerms,
          camera: spec.camera,
          composition: spec.composition,
          aspectRatio,
          lens: shot?.lens ?? null,
          lighting: spec.lighting,
          style: spec.visualStyle,
          environment: spec.environment,
          promptScore: score.overall,
          negativePrompt,
          shot: shot ?? null,
          narration: scriptScene?.narration ?? null,
        },
      }
    })
}

export { validateV7SceneImagePrompt, type V7SceneImagePromptPackage }

export function buildV7SceneStoragePath(params: {
  userId: string
  productionId: string
  sceneId: string
  attempt: number
}): string {
  return `${params.userId}/v7/${params.productionId}/scenes/${params.sceneId}/v1_a${params.attempt}.png`
}
