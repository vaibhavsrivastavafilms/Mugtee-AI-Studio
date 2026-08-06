import type { ImageGenerationContext, ImageResult } from '@/agents/image/schema'

/** Pluggable image generation provider contract. */
export interface V3ImageProvider {
  readonly id: string
  generate(context: ImageGenerationContext, params: V3ImageProviderParams): Promise<ImageResult>
}

export type V3ImageProviderParams = {
  userId: string
  projectId: string
  storagePath: string
}

export type V3ImageProviderId = 'gpt-image' | 'flux' | 'imagen' | 'midjourney' | 'stability'
