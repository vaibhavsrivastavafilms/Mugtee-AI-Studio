import 'server-only'

import {
  allowDalleImages,
  FREE_OPENAI_IMAGE_MODEL,
} from '@/lib/ai/free-tier'
import {
  generateOpenAISceneImage,
  resolveOpenAIImageSize,
} from '@/lib/ai/generate-scene-image'
import { createRemoteUrlImageProvider } from '@/lib/v7/providers/image-provider-base.server'

export const gptImageV7Provider = createRemoteUrlImageProvider({
  id: 'gpt-image',
  displayName: 'OpenAI GPT Image',
  modelId: FREE_OPENAI_IMAGE_MODEL,
  isConfigured: allowDalleImages,
  estimateMs: 45_000,
  healthCheck: async () => ({
    healthy: allowDalleImages(),
    message: allowDalleImages() ? undefined : 'OPENAI_API_KEY required (FREE_TIER_ONLY blocks paid APIs)',
  }),
  generateRemoteUrl: async (input) => {
    const size =
      input.width > input.height
        ? '1792x1024'
        : input.width === input.height
          ? '1024x1024'
          : '1024x1792'
    return generateOpenAISceneImage(input.prompt, {
      quality: 'hd',
      size,
      aspectRatio: input.aspectRatio,
    })
  },
})

export { resolveOpenAIImageSize }
