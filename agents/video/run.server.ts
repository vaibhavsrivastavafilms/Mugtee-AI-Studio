import 'server-only'



import {

  buildSceneVideoRequest,

  generateSceneVideoWithRetries,

} from '@/agents/video/generate.server'

import { validateRemoteVideoAsset } from '@/agents/video/validate.server'

import type {

  CinematicStyle,

  ProductionPlan,

  V3SceneImageRow,

  V3ScenePromptRow,

  V3SceneRow,

  V3SceneVideoRow,

} from '@/types/v3/production'

import { pickLatestSceneImages } from '@/lib/v3/scene-images.client'



export type VideoAgentParams = {

  plan: ProductionPlan

  style: CinematicStyle

  scenes: V3SceneRow[]

  scenePrompts: V3ScenePromptRow[]

  sceneImages: V3SceneImageRow[]

  userId: string

  projectId: string

  sceneIds?: string[]

  providerId?: string | null

}



export type VideoAgentSceneResult = {

  sceneId: string

  sceneNumber: number

  row: Omit<V3SceneVideoRow, 'id' | 'created_at' | 'updated_at'>

  attempts: number

}



export type VideoAgentResult = {

  results: VideoAgentSceneResult[]

  durationMs: number

}



export async function runVideoAgent(params: VideoAgentParams): Promise<VideoAgentResult> {

  const started = Date.now()



  if (params.scenePrompts.length === 0) {

    throw new Error('Scene prompts missing — run Prompt Engineering first')

  }

  if (!params.style) {

    throw new Error('Cinematic style missing')

  }



  const latestImages = pickLatestSceneImages(params.sceneImages).filter(

    (image) => image.status === 'completed' && image.image_url

  )

  const imageBySceneId = new Map(latestImages.map((image) => [image.scene_id, image]))

  const promptBySceneId = new Map(params.scenePrompts.map((prompt) => [prompt.scene_id, prompt]))



  const targetScenes = params.sceneIds?.length

    ? params.scenes.filter((scene) => params.sceneIds!.includes(scene.id))

    : params.scenes



  if (targetScenes.length === 0) {

    throw new Error('No scenes to generate videos for')

  }



  const results: VideoAgentSceneResult[] = []



  for (const scene of targetScenes.sort((a, b) => a.number - b.number)) {

    const promptRow = promptBySceneId.get(scene.id)

    if (!promptRow) {

      throw new Error(`Scene ${scene.number}: prompt missing`)

    }



    const masterImage = imageBySceneId.get(scene.id)

    if (!masterImage?.image_url) {

      throw new Error(`Scene ${scene.number}: master image missing — run Image Generation first`)

    }



    const context = buildSceneVideoRequest({

      scene,

      promptRow,

      masterImage,

      cinematicStyle: params.style,

      aspectRatio: params.plan.aspectRatio,

    })



    const { result, attempts } = await generateSceneVideoWithRetries({

      context,

      userId: params.userId,

      projectId: params.projectId,

      providerId: params.providerId,

    })



    await validateRemoteVideoAsset({ context, result })



    results.push({

      sceneId: scene.id,

      sceneNumber: scene.number,

      attempts,

      row: {

        project_id: params.projectId,

        scene_id: scene.id,

        image_id: masterImage.id,

        provider: result.provider,

        provider_job_id: result.providerJobId ?? null,

        video_url: result.videoUrl,

        thumbnail_url: result.thumbnailUrl ?? masterImage.image_url,

        duration_seconds: result.durationSeconds,

        fps: result.fps,

        resolution: result.resolution,

        generation_time_ms: result.generationTimeMs,

        status: 'completed',

        retry_count: attempts - 1,

        metadata: {

          ...(result.metadata as Record<string, unknown>),

          location: context.promptMetadata.location,

          style: params.style.filmStock,

          promptVersion: promptRow.prompt_version,

          sceneNumber: scene.number,

          imageId: masterImage.id,

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


