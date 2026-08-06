import { z } from 'zod'
import type { PromptMetadata, V3AspectRatio } from '@/types/v3/production'

export const imageResultSchema = z.object({
  provider: z.string().min(1),
  providerJobId: z.string().nullable().optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  seed: z.number().int(),
  width: z.number().int().min(256),
  height: z.number().int().min(256),
  generationTimeMs: z.number().int().min(0),
  metadata: z.record(z.string(), z.unknown()),
})

export type ImageResult = z.infer<typeof imageResultSchema>

export const imageGenerationContextSchema = z.object({
  sceneId: z.string().uuid(),
  sceneNumber: z.number().int().min(1),
  promptId: z.string().uuid(),
  promptVersion: z.number().int().min(1),
  imagePrompt: z.string().min(32),
  negativePrompt: z.string().min(8),
  promptMetadata: z.custom<PromptMetadata>(),
  aspectRatio: z.custom<V3AspectRatio>(),
  referenceImageUrls: z.array(z.string().url()).optional(),
})

export type ImageGenerationContext = z.infer<typeof imageGenerationContextSchema>

export function parseImageResult(raw: unknown) {
  return imageResultSchema.parse(raw)
}

export function parseImageGenerationContext(raw: unknown) {
  return imageGenerationContextSchema.parse(raw)
}

export function aspectRatioToDimensions(aspectRatio: V3AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1536, height: 1024 }
    case '1:1':
      return { width: 1024, height: 1024 }
    case '4:5':
      return { width: 1024, height: 1280 }
    case '9:16':
    default:
      return { width: 1024, height: 1536 }
  }
}

export function parseSeedValue(raw: string | undefined): number {
  if (!raw) return 0
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  const parsed = Number.parseInt(digits.slice(0, 9), 10)
  return Number.isFinite(parsed) ? parsed : 0
}
