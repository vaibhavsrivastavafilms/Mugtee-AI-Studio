import 'server-only'

import { parseImageResult } from '@/agents/image/schema'
import type { ImageGenerationContext, ImageResult } from '@/agents/image/schema'
import type { PromptMetadata } from '@/types/v3/production'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'

export function validateGeneratedImage(params: {
  context: ImageGenerationContext
  result: ImageResult
}): void {
  parseImageResult(params.result)

  if (!params.result.imageUrl.trim()) {
    throw new Error(`Scene ${params.context.sceneNumber}: image URL missing`)
  }
  if (isEphemeralRemoteImageUrl(params.result.imageUrl)) {
    throw new Error(`Scene ${params.context.sceneNumber}: ephemeral image URL rejected`)
  }

  const promptMeta = params.context.promptMetadata as PromptMetadata

  if (!promptMeta.location?.trim()) {
    throw new Error(`Scene ${params.context.sceneNumber}: location missing from prompt metadata`)
  }
  if (!promptMeta.camera?.trim()) {
    throw new Error(`Scene ${params.context.sceneNumber}: camera missing from prompt metadata`)
  }
  if (!promptMeta.lens?.trim()) {
    throw new Error(`Scene ${params.context.sceneNumber}: lens missing from prompt metadata`)
  }
  if (!promptMeta.lighting?.trim()) {
    throw new Error(`Scene ${params.context.sceneNumber}: lighting missing from prompt metadata`)
  }
  if (!promptMeta.style?.trim()) {
    throw new Error(`Scene ${params.context.sceneNumber}: cinematic style missing from prompt metadata`)
  }
  if (!promptMeta.aspectRatio) {
    throw new Error(`Scene ${params.context.sceneNumber}: aspect ratio missing from prompt metadata`)
  }

  const requiresCharacter = (params.context.referenceImageUrls?.length ?? 0) > 0
  if (requiresCharacter) {
    if (!promptMeta.characterAppearance?.trim()) {
      throw new Error(`Scene ${params.context.sceneNumber}: character appearance missing`)
    }
    if (!promptMeta.characterSeed?.trim()) {
      throw new Error(`Scene ${params.context.sceneNumber}: character seed missing`)
    }
  }

  if (!params.context.imagePrompt.includes('Location:')) {
    throw new Error(`Scene ${params.context.sceneNumber}: prompt missing location marker`)
  }
  if (!params.context.imagePrompt.includes('Camera:')) {
    throw new Error(`Scene ${params.context.sceneNumber}: prompt missing camera settings`)
  }
  if (!params.context.imagePrompt.includes(`Aspect Ratio: ${promptMeta.aspectRatio}`)) {
    throw new Error(`Scene ${params.context.sceneNumber}: prompt missing aspect ratio marker`)
  }

  const meta = params.result.metadata as Record<string, unknown>
  if (!meta.provider) {
    throw new Error(`Scene ${params.context.sceneNumber}: provider metadata missing`)
  }
}
