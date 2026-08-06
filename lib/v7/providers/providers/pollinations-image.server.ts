import 'server-only'

import { fetchPollinationsImageDataUrl } from '@/lib/image-providers/pollinations'
import { createRemoteUrlImageProvider } from '@/lib/v7/providers/image-provider-base.server'

export const pollinationsImageProvider = createRemoteUrlImageProvider({
  id: 'pollinations',
  displayName: 'Pollinations',
  modelId: 'pollinations-flux',
  isConfigured: () => true,
  estimateMs: 30_000,
  healthCheck: async () => ({ healthy: true }),
  generateRemoteUrl: async (input) => fetchPollinationsImageDataUrl(input.prompt),
})
