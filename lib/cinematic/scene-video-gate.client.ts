'use client'

import { pipelineRequiresSceneVideos } from '@/lib/economics/scene-video-requirement'

/** Whether the client may call POST /api/generate-scene-video. */
export function canInvokeSceneVideoApi(input: {
  generationMode: string
  planType: string
  sceneVideoProviderAvailable: boolean
}): boolean {
  if (!input.sceneVideoProviderAvailable) return false
  return pipelineRequiresSceneVideos({
    generationMode: input.generationMode,
    planType: input.planType,
  })
}
