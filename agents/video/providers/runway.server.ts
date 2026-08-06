import 'server-only'



import {

  aspectRatioToResolution,

  normalizeDurationSeconds,

  type SceneVideoRequest,

  type VideoResult,

} from '@/agents/video/schema'

import type { V3VideoProvider, V3VideoProviderParams } from '@/agents/video/provider'

import {

  generateRunwayVideo,

  hasRunwayApiKey,

  RUNWAY_DEFAULT_MODEL,

  RUNWAY_VERTICAL_RATIO,

} from '@/lib/ai/runway-video'

import { persistRemoteVideo, probeRemoteVideo } from '@/agents/video/video-storage.server'



function runwayRatio(aspectRatio: SceneVideoRequest['aspectRatio']): string {

  return aspectRatio === '16:9' ? '1280:720' : RUNWAY_VERTICAL_RATIO

}



export const runwayVideoProvider: V3VideoProvider = {

  id: 'runway',



  async generate(context, params: V3VideoProviderParams): Promise<VideoResult> {

    if (!hasRunwayApiKey()) {

      throw new Error('Runway provider requires RUNWAY_API_KEY or RUNWAYML_API_SECRET.')

    }



    const started = Date.now()

    const durationSeconds = normalizeDurationSeconds(context.durationSeconds, 'runway')

    const { taskId, videoUrl } = await generateRunwayVideo({

      promptText: context.videoPrompt,

      promptImage: context.imageUrl,

      durationSec: durationSeconds,

      ratio: runwayRatio(context.aspectRatio),

    })



    if (!videoUrl) {

      throw new Error('Runway provider returned no video URL')

    }



    await probeRemoteVideo(videoUrl)



    const persisted = await persistRemoteVideo({

      remoteUrl: videoUrl,

      storagePath: params.storagePath,

    })



    const resolution = aspectRatioToResolution(context.aspectRatio)

    const cameraMovement = context.promptMetadata.movement || context.cinematicStyle.motionStyle



    return {

      provider: 'runway',

      providerJobId: taskId,

      videoUrl: persisted,

      thumbnailUrl: context.imageUrl,

      durationSeconds,

      fps: 30,

      resolution,

      generationTimeMs: Date.now() - started,

      metadata: {

        provider: 'runway',

        model: RUNWAY_DEFAULT_MODEL,

        cameraMovement,

        aspectRatio: context.aspectRatio,

        duration: durationSeconds,

        fps: 30,

      },

    }

  },

}


