import 'server-only'

import {
  aspectRatioToDimensions,
  parseSeedValue,
  type ImageGenerationContext,
  type ImageResult,
} from '@/agents/image/schema'
import type { V3ImageProvider, V3ImageProviderParams } from '@/agents/image/provider'
import {
  FREE_OPENAI_IMAGE_MODEL,
  allowDalleImages,
} from '@/lib/ai/free-tier'
import {
  generateOpenAISceneImage,
  persistRemoteImage,
  resolveOpenAIImageSize,
} from '@/lib/ai/generate-scene-image'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'

export const gptImageProvider: V3ImageProvider = {
  id: 'gpt-image',

  async generate(context, params): Promise<ImageResult> {
    if (!allowDalleImages()) {
      throw new Error(
        'GPT Image provider requires OPENAI_API_KEY (and FREE_TIER_ONLY must not block paid image APIs).'
      )
    }

    const started = Date.now()
    const { width, height } = aspectRatioToDimensions(context.aspectRatio)
    const size =
      width > height ? '1792x1024' : width === height ? '1024x1024' : '1024x1792'

    const remoteUrl = await generateOpenAISceneImage(context.imagePrompt, {
      quality: 'hd',
      size,
    })

    if (!remoteUrl) {
      throw new Error('GPT Image provider returned no image')
    }

    const persisted = await persistRemoteImage({
      remoteUrl,
      userId: params.userId,
      filename: params.storagePath,
    })

    if (isEphemeralRemoteImageUrl(persisted)) {
      throw new Error('GPT Image output was not persisted to durable storage')
    }

    const seed = parseSeedValue(context.promptMetadata.characterSeed) || context.sceneNumber * 100_000

    return {
      provider: 'gpt-image',
      providerJobId: null,
      imageUrl: persisted,
      thumbnailUrl: persisted,
      seed,
      width,
      height,
      generationTimeMs: Date.now() - started,
      metadata: {
        provider: 'gpt-image',
        model: FREE_OPENAI_IMAGE_MODEL,
        quality: 'high',
        style: context.promptMetadata.style,
        camera: context.promptMetadata.camera,
        seed,
        openaiSize: resolveOpenAIImageSize(size),
      },
    }
  },
}
