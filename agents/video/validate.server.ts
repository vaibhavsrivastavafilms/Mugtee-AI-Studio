import 'server-only'



import { parseVideoResult } from '@/agents/video/schema'

import type { SceneVideoRequest, VideoResult } from '@/agents/video/schema'

import type { PromptMetadata } from '@/types/v3/production'

import { probeRemoteVideo } from '@/agents/video/video-storage.server'



export function validateGeneratedVideo(params: {

  context: SceneVideoRequest

  result: VideoResult

}): void {

  parseVideoResult(params.result)



  if (!params.result.videoUrl.trim()) {

    throw new Error(`Scene ${params.context.sceneNumber}: video URL missing`)

  }



  const promptMeta = params.context.promptMetadata as PromptMetadata



  if (!promptMeta.movement?.trim() && !params.context.cinematicStyle.motionStyle?.trim()) {

    throw new Error(`Scene ${params.context.sceneNumber}: camera movement missing`)

  }

  if (!promptMeta.aspectRatio) {

    throw new Error(`Scene ${params.context.sceneNumber}: aspect ratio missing from prompt metadata`)

  }

  if (promptMeta.aspectRatio !== params.context.aspectRatio) {

    throw new Error(`Scene ${params.context.sceneNumber}: aspect ratio continuity mismatch`)

  }

  if (!promptMeta.location?.trim()) {

    throw new Error(`Scene ${params.context.sceneNumber}: location missing from prompt metadata`)

  }

  if (!params.context.videoPrompt.trim()) {

    throw new Error(`Scene ${params.context.sceneNumber}: video prompt missing`)

  }



  const meta = params.result.metadata as Record<string, unknown>

  if (!meta.provider) {

    throw new Error(`Scene ${params.context.sceneNumber}: provider metadata missing`)

  }

  if (!meta.aspectRatio) {

    throw new Error(`Scene ${params.context.sceneNumber}: aspect ratio metadata missing`)

  }

  if (!meta.cameraMovement) {

    throw new Error(`Scene ${params.context.sceneNumber}: camera movement metadata missing`)

  }



  const expectedDuration = params.context.durationSeconds

  const actualDuration = params.result.durationSeconds

  if (Math.abs(actualDuration - expectedDuration) > 2) {

    throw new Error(

      `Scene ${params.context.sceneNumber}: duration mismatch (expected ~${expectedDuration}s, got ${actualDuration}s)`

    )

  }



  if (!params.result.resolution?.trim()) {

    throw new Error(`Scene ${params.context.sceneNumber}: resolution missing`)

  }

  if (!params.result.fps || params.result.fps < 1) {

    throw new Error(`Scene ${params.context.sceneNumber}: fps missing or invalid`)

  }

}



export async function validateRemoteVideoAsset(params: {

  context: SceneVideoRequest

  result: VideoResult

}): Promise<void> {

  validateGeneratedVideo(params)

  await probeRemoteVideo(params.result.videoUrl)

}


