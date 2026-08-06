import 'server-only'

import {
  buildImageGenerationContext,
  generateSceneImageWithRetries,
} from '@/agents/image/generate.server'
import { validateGeneratedImage } from '@/agents/image/validate.server'
import type {
  CinematicStyle,
  ProductionPlan,
  V3CharacterRow,
  V3LocationRow,
  V3SceneImageRow,
  V3ScenePromptRow,
  V3SceneRow,
} from '@/types/v3/production'

export type ImageAgentParams = {
  plan: ProductionPlan
  style: CinematicStyle
  scenes: V3SceneRow[]
  scenePrompts: V3ScenePromptRow[]
  characters: V3CharacterRow[]
  locations: V3LocationRow[]
  userId: string
  projectId: string
  sceneIds?: string[]
  providerId?: string | null
}

export type ImageAgentSceneResult = {
  sceneId: string
  sceneNumber: number
  row: Omit<V3SceneImageRow, 'id' | 'created_at' | 'updated_at'>
  attempts: number
}

export type ImageAgentResult = {
  results: ImageAgentSceneResult[]
  durationMs: number
}

export async function runImageAgent(params: ImageAgentParams): Promise<ImageAgentResult> {
  const started = Date.now()

  if (params.scenePrompts.length === 0) {
    throw new Error('Scene prompts missing — run Prompt Engineering first')
  }
  if (!params.style) {
    throw new Error('Cinematic style missing')
  }

  const promptBySceneId = new Map(params.scenePrompts.map((p) => [p.scene_id, p]))
  const targetScenes = params.sceneIds?.length
    ? params.scenes.filter((s) => params.sceneIds!.includes(s.id))
    : params.scenes

  if (targetScenes.length === 0) {
    throw new Error('No scenes to generate images for')
  }

  const results: ImageAgentSceneResult[] = []

  for (const scene of targetScenes.sort((a, b) => a.number - b.number)) {
    const promptRow = promptBySceneId.get(scene.id)
    if (!promptRow) {
      throw new Error(`Scene ${scene.number}: prompt missing`)
    }

    const context = buildImageGenerationContext({
      promptRow,
      sceneNumber: scene.number,
      aspectRatio: params.plan.aspectRatio,
      characters: params.characters,
      sceneCharacterIds: scene.character_ids,
    })

    const { result, attempts } = await generateSceneImageWithRetries({
      context,
      userId: params.userId,
      projectId: params.projectId,
      providerId: params.providerId,
    })

    validateGeneratedImage({ context, result })

    results.push({
      sceneId: scene.id,
      sceneNumber: scene.number,
      attempts,
      row: {
        project_id: params.projectId,
        scene_id: scene.id,
        prompt_id: promptRow.id,
        provider: result.provider,
        provider_job_id: result.providerJobId ?? null,
        image_url: result.imageUrl,
        thumbnail_url: result.thumbnailUrl ?? result.imageUrl,
        seed: result.seed,
        width: result.width,
        height: result.height,
        generation_time_ms: result.generationTimeMs,
        status: 'completed',
        metadata: {
          ...(result.metadata as Record<string, unknown>),
          location: context.promptMetadata.location,
          aspectRatio: context.promptMetadata.aspectRatio,
          characterSeed: context.promptMetadata.characterSeed,
          style: params.style.filmStock,
          camera: context.promptMetadata.camera,
          promptVersion: promptRow.prompt_version,
          attempt: attempts,
        },
      },
    })
  }

  return {
    results,
    durationMs: Date.now() - started,
  }
}
