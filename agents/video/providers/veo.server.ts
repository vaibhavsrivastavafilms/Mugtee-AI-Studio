import 'server-only'



import {

  aspectRatioToResolution,

  clampVeoDurationSeconds,

  type SceneVideoRequest,

  type VideoResult,

} from '@/agents/video/schema'

import type { V3VideoProvider, V3VideoProviderParams } from '@/agents/video/provider'

import { persistRemoteVideo, probeRemoteVideo } from '@/agents/video/video-storage.server'



const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const DEFAULT_VEO_MODEL = 'veo-3.0-generate-preview'



function delay(ms: number) {

  return new Promise((resolve) => setTimeout(resolve, ms))

}



export function getVeoApiKey(): string | undefined {

  return (

    process.env.GOOGLE_VEO_API_KEY?.trim() ||

    process.env.VEO_API_KEY?.trim() ||

    process.env.GEMINI_API_KEY?.trim() ||

    undefined

  )

}



export function hasVeoApiKey(): boolean {

  return Boolean(getVeoApiKey())

}



function resolveVeoModel(): string {

  return process.env.V3_VEO_MODEL?.trim() || DEFAULT_VEO_MODEL

}



async function fetchImageAsBase64(imageUrl: string): Promise<{ mimeType: string; data: string }> {

  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })

  if (!res.ok) {

    throw new Error(`Failed to fetch master image for Veo (${res.status})`)

  }

  const buffer = Buffer.from(await res.arrayBuffer())

  const mimeType = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim()

  return { mimeType, data: buffer.toString('base64') }

}



type VeoOperation = {

  name?: string

  done?: boolean

  error?: { message?: string }

  response?: {

    generateVideoResponse?: {

      generatedSamples?: Array<{ video?: { uri?: string } }>

    }

  }

}



async function pollVeoOperation(operationName: string, apiKey: string): Promise<string> {

  const pollUrl = operationName.startsWith('http')

    ? operationName

    : `${GEMINI_API_BASE}/${operationName.replace(/^\//, '')}`



  for (let attempt = 0; attempt < 120; attempt++) {

    await delay(attempt === 0 ? 2_000 : 5_000)



    const res = await fetch(pollUrl, {

      headers: { 'x-goog-api-key': apiKey },

      signal: AbortSignal.timeout(30_000),

    })



    if (!res.ok) {

      const text = await res.text().catch(() => '')

      throw new Error(`Veo operation poll failed (${res.status}): ${text.slice(0, 200)}`)

    }



    const body = (await res.json()) as VeoOperation

    if (body.error?.message) {

      throw new Error(body.error.message)

    }



    if (body.done) {

      const videoUri = body.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri

      if (!videoUri) {

        throw new Error('Veo operation completed without a video URI')

      }

      return videoUri

    }

  }



  throw new Error('Veo video generation timed out')

}



export async function generateVeoVideoFromImage(params: {

  context: SceneVideoRequest

  apiKey: string

  model?: string

}): Promise<{ videoUri: string; providerJobId: string; durationSeconds: number }> {

  const model = params.model ?? resolveVeoModel()

  const durationSeconds = clampVeoDurationSeconds(params.context.durationSeconds)

  const image = await fetchImageAsBase64(params.context.imageUrl)



  const requestBody = {

    instances: [

      {

        prompt: params.context.videoPrompt,

        image: {

          mimeType: image.mimeType,

          bytesBase64Encoded: image.data,

        },

      },

    ],

    parameters: {

      aspectRatio: params.context.aspectRatio,

      durationSeconds,

      sampleCount: 1,

      resolution: '720p',

    },

  }



  const createRes = await fetch(`${GEMINI_API_BASE}/models/${model}:predictLongRunning`, {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      'x-goog-api-key': params.apiKey,

    },

    body: JSON.stringify(requestBody),

    signal: AbortSignal.timeout(60_000),

  })



  if (!createRes.ok) {

    const text = await createRes.text().catch(() => '')

    throw new Error(`Veo predictLongRunning failed (${createRes.status}): ${text.slice(0, 300)}`)

  }



  const created = (await createRes.json()) as VeoOperation

  const operationName = created.name

  if (!operationName) {

    throw new Error('Veo did not return an operation name')

  }



  const videoUri = await pollVeoOperation(operationName, params.apiKey)

  return { videoUri, providerJobId: operationName, durationSeconds }

}



export const veoVideoProvider: V3VideoProvider = {

  id: 'veo',



  async generate(context, params: V3VideoProviderParams): Promise<VideoResult> {

    const apiKey = getVeoApiKey()

    if (!apiKey) {

      throw new Error(

        'Veo provider requires GEMINI_API_KEY, GOOGLE_VEO_API_KEY, or VEO_API_KEY.'

      )

    }



    const started = Date.now()

    const { videoUri, providerJobId, durationSeconds } = await generateVeoVideoFromImage({

      context,

      apiKey,

      model: resolveVeoModel(),

    })



    await probeRemoteVideo(videoUri, { 'x-goog-api-key': apiKey })



    const persisted = await persistRemoteVideo({

      remoteUrl: videoUri,

      storagePath: params.storagePath,

      headers: { 'x-goog-api-key': apiKey },

    })



    const resolution = aspectRatioToResolution(context.aspectRatio)

    const cameraMovement = context.promptMetadata.movement || context.cinematicStyle.motionStyle



    return {

      provider: 'veo',

      providerJobId,

      videoUrl: persisted,

      thumbnailUrl: context.imageUrl,

      durationSeconds,

      fps: 30,

      resolution,

      generationTimeMs: Date.now() - started,

      metadata: {

        provider: 'veo',

        model: 'veo-3',

        cameraMovement,

        aspectRatio: context.aspectRatio,

        duration: durationSeconds,

        fps: 30,

      },

    }

  },

}


