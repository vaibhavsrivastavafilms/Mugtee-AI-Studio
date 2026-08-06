import 'server-only'

import { generateSdxlImage, getSdxlModelId, hasSdxlApiKey } from '@/lib/image-providers/sdxl'
import { createRemoteUrlImageProvider } from '@/lib/v7/providers/image-provider-base.server'

export const sdxlImageProvider = createRemoteUrlImageProvider({
  id: 'sdxl',
  displayName: 'SDXL',
  modelId: getSdxlModelId(),
  isConfigured: hasSdxlApiKey,
  estimateMs: 45_000,
  healthCheck: async () => ({
    healthy: hasSdxlApiKey(),
    message: hasSdxlApiKey() ? undefined : 'TOGETHER_API_KEY or STABILITY_API_KEY required',
  }),
  generateRemoteUrl: async (input) => {
    const result = await generateSdxlImage(input.prompt, {
      aspectRatio: input.aspectRatio,
      seed: input.seed,
    })
    return result?.url ?? null
  },
})
