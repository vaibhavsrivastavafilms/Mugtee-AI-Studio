import 'server-only'

import { generateFluxApiImage, hasFluxApiKey } from '@/lib/image-providers/fluxapi'
import { createRemoteUrlImageProvider } from '@/lib/v7/providers/image-provider-base.server'

const MODEL = process.env.FLUXAPI_MODEL?.trim() ?? 'flux-kontext-pro'

export const fluxImageProvider = createRemoteUrlImageProvider({
  id: 'flux',
  displayName: 'FLUX Kontext',
  modelId: MODEL,
  isConfigured: hasFluxApiKey,
  estimateMs: 90_000,
  healthCheck: async () => ({
    healthy: hasFluxApiKey(),
    message: hasFluxApiKey() ? undefined : 'FLUXAPI_KEY not configured',
  }),
  generateRemoteUrl: async (input) =>
    generateFluxApiImage(input.prompt, {
      aspectRatio: input.aspectRatio,
      model: MODEL,
      promptUpsampling: true,
    }),
})
