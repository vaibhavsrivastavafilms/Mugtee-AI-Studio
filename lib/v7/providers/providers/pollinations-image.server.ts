import 'server-only'

import { fetchPollinationsImageDataUrl } from '@/lib/pollinations/client.server'
import { probePollinationsHealth } from '@/lib/pollinations/models.server'
import { createRemoteUrlImageProvider } from '@/lib/v7/providers/image-provider-base.server'

export const pollinationsImageProvider = createRemoteUrlImageProvider({
  id: 'pollinations',
  displayName: 'Pollinations',
  modelId: 'discovered',
  isConfigured: () => true,
  estimateMs: 45_000,
  healthCheck: async () => {
    const probe = await probePollinationsHealth()
    return { healthy: probe.imageReady, message: probe.reason ?? undefined }
  },
  generateRemoteUrl: async (input) => {
    const avoid = input.negativePrompt?.trim()
    const prompt = avoid ? `${input.prompt}\n\nAvoid: ${avoid}` : input.prompt
    return fetchPollinationsImageDataUrl(prompt, {
      width: input.width,
      height: input.height,
      seed: input.seed,
      maxAttempts: input.maxAttempts,
      model: input.model,
    })
  },
})
