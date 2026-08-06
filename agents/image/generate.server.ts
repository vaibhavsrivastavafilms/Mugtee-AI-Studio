import 'server-only'

import { parseImageResult, type ImageGenerationContext, type ImageResult } from '@/agents/image/schema'
import type { V3ImageProvider } from '@/agents/image/provider'
import { resolveV3ImageProvider } from '@/agents/image/providers/registry.server'
import type { PromptMetadata, ScenePrompt, V3CharacterRow } from '@/types/v3/production'

export const V3_IMAGE_MAX_RETRIES = 3

export type BuildImageContextParams = {
  promptRow: {
    id: string
    scene_id: string
    image_prompt: string
    negative_prompt: string
    prompt_version: number
    metadata: PromptMetadata | Record<string, unknown>
  }
  sceneNumber: number
  aspectRatio: ScenePrompt['metadata']['aspectRatio']
  characters: V3CharacterRow[]
  sceneCharacterIds: string[]
}

export function buildImageGenerationContext(params: BuildImageContextParams): ImageGenerationContext {
  const metadata = params.promptRow.metadata as PromptMetadata
  const referenceImageUrls = params.characters
    .filter((c) => params.sceneCharacterIds.includes(c.id) && c.reference_image)
    .map((c) => c.reference_image as string)

  return {
    sceneId: params.promptRow.scene_id,
    sceneNumber: params.sceneNumber,
    promptId: params.promptRow.id,
    promptVersion: params.promptRow.prompt_version,
    imagePrompt: params.promptRow.image_prompt,
    negativePrompt: params.promptRow.negative_prompt,
    promptMetadata: metadata,
    aspectRatio: params.aspectRatio,
    referenceImageUrls,
  }
}

export function buildSceneImageStoragePath(params: {
  userId: string
  projectId: string
  sceneId: string
  promptVersion: number
  attempt: number
}): string {
  return `${params.userId}/v3/${params.projectId}/scenes/${params.sceneId}/v${params.promptVersion}_a${params.attempt}.png`
}

export async function generateSceneImageWithRetries(params: {
  context: ImageGenerationContext
  userId: string
  projectId: string
  providerId?: string | null
  maxRetries?: number
}): Promise<{ result: ImageResult; attempts: number }> {
  const provider: V3ImageProvider = resolveV3ImageProvider(params.providerId)
  const maxRetries = params.maxRetries ?? V3_IMAGE_MAX_RETRIES
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const storagePath = buildSceneImageStoragePath({
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

      const result = parseImageResult({
        ...raw,
        metadata: {
          ...raw.metadata,
          attempt,
        },
      })

      return { result, attempts: attempt }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Image generation failed')
      if (attempt >= maxRetries) break
    }
  }

  throw lastError ?? new Error('Image generation failed')
}
