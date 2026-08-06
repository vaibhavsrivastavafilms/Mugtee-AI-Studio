import 'server-only'



import {

  normalizeDurationSeconds,

  parseVideoResult,

  type SceneVideoRequest,

  type VideoResult,

} from '@/agents/video/schema'

import type { VideoProvider } from '@/agents/video/provider'

import { resolveV3VideoProvider } from '@/agents/video/providers/registry.server'

import type {

  CinematicStyle,

  PromptMetadata,

  V3AspectRatio,

  V3SceneImageRow,

  V3ScenePromptRow,

  V3SceneRow,

} from '@/types/v3/production'



export const V3_VIDEO_MAX_RETRIES = 3



export type BuildVideoContextParams = {

  scene: V3SceneRow

  promptRow: V3ScenePromptRow

  masterImage: V3SceneImageRow

  cinematicStyle: CinematicStyle

  aspectRatio: V3AspectRatio

}



export function buildSceneVideoRequest(params: BuildVideoContextParams): SceneVideoRequest {

  const metadata = params.promptRow.metadata as PromptMetadata

  const sceneDuration = params.scene.duration ?? 6

  const durationSeconds = normalizeDurationSeconds(sceneDuration)



  if (!params.masterImage.image_url) {

    throw new Error(`Scene ${params.scene.number}: master image URL missing`)

  }



  return {

    sceneId: params.scene.id,

    sceneNumber: params.scene.number,

    promptId: params.promptRow.id,

    promptVersion: params.promptRow.prompt_version,

    imageId: params.masterImage.id,

    imageUrl: params.masterImage.image_url,

    videoPrompt: params.promptRow.video_prompt,

    negativePrompt: params.promptRow.negative_prompt,

    promptMetadata: metadata,

    cinematicStyle: params.cinematicStyle,

    aspectRatio: params.aspectRatio,

    durationSeconds,

    sceneDuration,

  }

}



export function buildSceneVideoStoragePath(params: {

  userId: string

  projectId: string

  sceneId: string

  promptVersion: number

  attempt: number

}): string {

  return `${params.userId}/v3/${params.projectId}/scenes/${params.sceneId}/v${params.promptVersion}_a${params.attempt}.mp4`

}



export async function generateSceneVideoWithRetries(params: {

  context: SceneVideoRequest

  userId: string

  projectId: string

  providerId?: string | null

  maxRetries?: number

}): Promise<{ result: VideoResult; attempts: number }> {

  const provider: VideoProvider = resolveV3VideoProvider(params.providerId)

  const maxRetries = params.maxRetries ?? V3_VIDEO_MAX_RETRIES

  let lastError: Error | null = null



  for (let attempt = 1; attempt <= maxRetries; attempt++) {

    try {

      const storagePath = buildSceneVideoStoragePath({

        userId: params.userId,

        projectId: params.projectId,

        sceneId: params.context.sceneId,

        promptVersion: params.context.promptVersion,

        attempt,

      })



      const raw = await provider.generate(params.context, {

        userId: params.userId,

        projectId: params.projectId,

        storagePath,

      })



      const result = parseVideoResult({

        ...raw,

        metadata: {

          ...raw.metadata,

          attempt,

        },

      })



      return { result, attempts: attempt }

    } catch (err) {

      lastError = err instanceof Error ? err : new Error('Video generation failed')

      if (attempt >= maxRetries) break

    }

  }



  throw lastError ?? new Error('Video generation failed')

}


