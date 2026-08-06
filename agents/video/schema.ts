import { z } from 'zod'

import type { CinematicStyle, PromptMetadata, V3AspectRatio } from '@/types/v3/production'



export const videoResultSchema = z.object({

  provider: z.string().min(1),

  providerJobId: z.string().nullable().optional(),

  videoUrl: z.string().url(),

  thumbnailUrl: z.string().url().nullable().optional(),

  durationSeconds: z.number().positive(),

  fps: z.number().int().min(1).max(120),

  resolution: z.string().min(3),

  generationTimeMs: z.number().int().min(0),

  metadata: z.record(z.string(), z.unknown()),

})



export type VideoResult = z.infer<typeof videoResultSchema>



export const sceneVideoRequestSchema = z.object({

  sceneId: z.string().uuid(),

  sceneNumber: z.number().int().min(1),

  promptId: z.string().uuid(),

  promptVersion: z.number().int().min(1),

  imageId: z.string().uuid(),

  imageUrl: z.string().url(),

  videoPrompt: z.string().min(16),

  negativePrompt: z.string().min(8),

  promptMetadata: z.custom<PromptMetadata>(),

  cinematicStyle: z.custom<CinematicStyle>(),

  aspectRatio: z.custom<V3AspectRatio>(),

  durationSeconds: z.number().positive(),

  sceneDuration: z.number().positive().optional(),

})



export type SceneVideoRequest = z.infer<typeof sceneVideoRequestSchema>



export function parseVideoResult(raw: unknown) {

  return videoResultSchema.parse(raw)

}



export function parseSceneVideoRequest(raw: unknown) {

  return sceneVideoRequestSchema.parse(raw)

}



export function aspectRatioToResolution(aspectRatio: V3AspectRatio, tier: '720p' | '1080p' = '720p'): string {

  switch (aspectRatio) {

    case '16:9':

      return tier === '1080p' ? '1920x1080' : '1280x720'

    case '1:1':

      return tier === '1080p' ? '1080x1080' : '720x720'

    case '4:5':

      return tier === '1080p' ? '1080x1350' : '720x900'

    case '9:16':

    default:

      return tier === '1080p' ? '1080x1920' : '720x1280'

  }

}



export function clampVeoDurationSeconds(duration: number): number {

  const options = [4, 6, 8] as const

  return options.reduce((best, value) =>

    Math.abs(value - duration) < Math.abs(best - duration) ? value : best

  )

}



export function normalizeDurationSeconds(duration: number, providerId?: string): number {

  if (providerId === 'veo') return clampVeoDurationSeconds(duration)

  return Math.max(2, Math.min(10, Math.round(duration)))

}


