import 'server-only'

import { aspectRatioToDimensions } from '@/agents/image/schema'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V3AspectRatio } from '@/types/v3/production'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import { clampV7SceneVideoDuration } from '@/lib/v7/providers/video-provider-base.server'
import type { V7VideoConsistencyMode } from '@/lib/v7/providers/video-provider.types'
import {
  buildCharacterGroundingBlock,
  buildEnvironmentGroundingBlock,
  resolveStoryboardCamera,
  type V7ScriptScene,
} from '@/lib/v7/scene-grounding.server'

export type V7SceneVideoBundle = {
  sceneNumber: number
  sceneId: string
  prompt: string
  negativePrompt: string
  imageUrl: string
  seed: number
  aspectRatio: V3AspectRatio
  width: number
  height: number
  durationSec: number
  continuityId: string
  cameraMovement: string
  narration: string
  dialogue: string
  consistencyModes: V7VideoConsistencyMode[]
  promptArchive: Record<string, unknown>
}

function deriveProductionSeed(productionId: string): number {
  let hash = 2_147_483_647
  for (const char of productionId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash % 2_000_000_000
}

export function buildV7SceneVideoStoragePath(params: {
  userId: string
  productionId: string
  sceneId: string
  attempt: number
}): string {
  return `${params.userId}/v7/${params.productionId}/scenes/${params.sceneId}/video_a${params.attempt}.mp4`
}

export function buildV7SceneVideoBundles(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number; storyboard?: Record<string, unknown> }>
  productionId: string
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
}): V7SceneVideoBundle[] {
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
                  `Shot ${index + 1}: ${entry.camera ?? entry.composition ?? 'medium'}, movement ${entry.movement ?? 'slow push'}, dialogue "${entry.dialogue ?? ''}"`
              )
              .join(' | ')
          : null
      const boardData = (scene.storyboard ?? {}) as { imageUrl?: string }
      const imageUrl = boardData.imageUrl?.trim() ?? ''
      const camera = resolveStoryboardCamera(shot, scriptScene)
      const location = scriptScene?.location ?? params.brief.location ?? 'On location'
      const action = scriptScene?.action ?? scriptScene?.narration ?? shot?.dialogue ?? ''
      const narration = scriptScene?.narration ?? ''
      const dialogue = shot?.dialogue ?? scriptScene?.dialogue ?? ''
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
      const cameraMovement =
        shot?.movement ?? scriptScene?.movement ?? 'Slow cinematic push'
      const durationSec = clampV7SceneVideoDuration(scriptScene?.duration ?? shot?.timing)

      const prompt = [
        'Cinematic live-action scene clip. Photorealistic motion, natural parallax, depth, and lighting.',
        'Follow the approved screenplay and storyboard exactly — never generic stock footage.',
        `Continuity ID: ${continuityId}`,
        shotPlan ? `Storyboard shot plan: ${shotPlan}` : null,
        characterBlock,
        environmentBlock,
        `Location: ${location}`,
        `Camera: ${camera}`,
        `Camera movement: ${cameraMovement}`,
        `Lighting: ${shot?.lighting ?? scriptScene?.lighting ?? params.direction.lighting}`,
        narration ? `Narration: ${narration}` : null,
        dialogue ? `Dialogue: ${dialogue}` : null,
        `Action: ${action}`,
        shot?.emotion ? `Emotion: ${shot.emotion}` : scriptScene?.emotion ? `Emotion: ${scriptScene.emotion}` : null,
        `Style: ${params.brief.style}, ${params.direction.animationStyle}`,
      ]
        .filter(Boolean)
        .join('\n')

      const negativePrompt = [
        'slideshow, static photo, unrelated subjects, wrong character face, wrong wardrobe,',
        'wrong environment, random stock footage, cartoon, anime, watermark, text overlay,',
        'camera plan violation, lighting violation, continuity break',
      ].join(' ')

      const consistencyModes: V7VideoConsistencyMode[] = ['prompt']
      if (params.brief.characterConsistency) {
        consistencyModes.push('pulid', 'ip-adapter', 'instantid')
      }

      return {
        sceneNumber: scene.number,
        sceneId: scene.id,
        prompt,
        negativePrompt,
        imageUrl,
        seed: baseSeed + scene.number * 10_007,
        aspectRatio,
        width,
        height,
        durationSec,
        continuityId,
        cameraMovement,
        narration,
        dialogue,
        consistencyModes,
        promptArchive: {
          sceneNumber: scene.number,
          continuityId,
          location,
          camera,
          cameraMovement,
          action,
          narration,
          dialogue,
          characterBlock,
          environmentBlock,
          shot: shot ?? null,
        },
      }
    })
}
