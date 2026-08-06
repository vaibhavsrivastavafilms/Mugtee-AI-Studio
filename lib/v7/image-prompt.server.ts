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
  buildCharacterGroundingBlock,
  buildEnvironmentGroundingBlock,
  resolveStoryboardCamera,
  type V7ScriptScene,
} from '@/lib/v7/scene-grounding.server'

const CINEMATIC_QUALITY =
  'Live-action cinematic photograph, photorealistic, NOT illustration. ' +
  'Shallow depth of field, anamorphic lens bokeh, film grain, volumetric lighting, ' +
  'atmospheric haze, wet surface reflections, rich color grade, high dynamic range.'

const CONSISTENCY_BLOCK =
  'Character consistency: preserve same face, hair, clothing, accessories, body type, age, skin tone, and expressions across scenes. ' +
  'Environment consistency: preserve restaurant layout, furniture, architecture, props, lighting direction, weather, and mood.'

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
      const scriptScene = params.script.scenes.find((s) => s.number === scene.number) as
        | V7ScriptScene
        | undefined
      const board = params.storyboard.scenes.find((s) => s.number === scene.number)
      const shots = board?.shots ?? []
      const shot = shots[0]
      const shotPlan =
        shots.length > 1
          ? shots
              .map(
                (entry, index) =>
                  `Shot ${index + 1}: camera ${entry.camera ?? entry.composition ?? 'medium'}, lighting ${entry.lighting ?? 'cinematic'}, emotion ${entry.emotion ?? 'natural'}, dialogue "${entry.dialogue ?? ''}"`
              )
              .join(' | ')
          : null
      const camera = resolveStoryboardCamera(shot, scriptScene)
      const location = scriptScene?.location ?? params.brief.location ?? 'On location'
      const action = scriptScene?.action ?? scriptScene?.narration ?? shot?.dialogue ?? ''
      const narration = scriptScene?.narration ?? shot?.dialogue ?? ''
      const characterBlock = buildCharacterGroundingBlock(
        params.characterBible,
        scriptScene,
        params.brief
      )
      const environmentBlock = buildEnvironmentGroundingBlock(
        params.worldBible,
        location,
        params.direction,
        params.brief
      )
      const continuityId = `${params.productionId}:scene-${scene.number}`
      const weather =
        params.brief.title.toLowerCase().includes('monsoon') ||
        params.brief.emotion.toLowerCase().includes('monsoon')
          ? 'Heavy monsoon rain, mist, wet pavement reflections, steam rising from hot food.'
          : params.direction.lighting

      const prompt = [
        CINEMATIC_QUALITY,
        CONSISTENCY_BLOCK,
        `Continuity ID: ${continuityId}`,
        shotPlan ? `Storyboard shot plan: ${shotPlan}` : null,
        characterBlock,
        environmentBlock,
        `Location: ${location}`,
        `Camera: ${camera}`,
        `Aspect Ratio: ${aspectRatio}`,
        `Lens: ${shot?.lens ?? '35mm anamorphic cinema lens'}`,
        `Lighting: ${shot?.lighting ?? scriptScene?.lighting ?? params.direction.lighting}`,
        `Weather and atmosphere: ${weather}`,
        narration ? `Narration: ${narration}` : null,
        shot?.dialogue ? `Dialogue: ${shot.dialogue}` : scriptScene?.dialogue ? `Dialogue: ${scriptScene.dialogue}` : null,
        shot?.emotion ? `Emotion: ${shot.emotion}` : scriptScene?.emotion ? `Emotion: ${scriptScene.emotion}` : null,
        `Action: ${action}`,
        `Style: ${params.brief.style}, ${params.direction.animationStyle}`,
        shot?.composition ? `Composition: ${shot.composition}` : null,
        shot?.movement ? `Camera movement intent: ${shot.movement}` : scriptScene?.movement ? `Movement: ${scriptScene.movement}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      const negativePrompt = [
        'blurry, watermark, text overlay, logo, deformed, cartoon, anime, flat lighting,',
        'oversaturated, low resolution, duplicate limbs, extra fingers, AI artifacts,',
        'inconsistent character face, wrong wardrobe, wrong restaurant layout',
      ].join(' ')

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
        promptArchive: {
          sceneNumber: scene.number,
          continuityId,
          location,
          camera,
          aspectRatio,
          lens: shot?.lens ?? '35mm anamorphic',
          lighting: shot?.lighting ?? scriptScene?.lighting ?? params.direction.lighting,
          style: params.brief.style,
          characterBlock,
          environmentBlock,
          shot: shot ?? null,
          action,
          narration,
        },
      }
    })
}

export function buildV7SceneStoragePath(params: {
  userId: string
  productionId: string
  sceneId: string
  attempt: number
}): string {
  return `${params.userId}/v7/${params.productionId}/scenes/${params.sceneId}/v1_a${params.attempt}.png`
}
