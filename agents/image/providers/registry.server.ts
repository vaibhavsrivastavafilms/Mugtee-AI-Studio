import 'server-only'

import type { V3ImageProvider, V3ImageProviderId } from '@/agents/image/provider'
import { gptImageProvider } from '@/agents/image/providers/gpt-image.server'

function stubProvider(id: V3ImageProviderId): V3ImageProvider {
  return {
    id,
    async generate() {
      throw new Error(
        `${id} provider is not implemented yet. Set V3_IMAGE_PROVIDER=gpt-image or configure OPENAI_API_KEY.`
      )
    },
  }
}

const PROVIDERS: Record<V3ImageProviderId, V3ImageProvider> = {
  'gpt-image': gptImageProvider,
  flux: stubProvider('flux'),
  imagen: stubProvider('imagen'),
  midjourney: stubProvider('midjourney'),
  stability: stubProvider('stability'),
}

export function resolveV3ImageProvider(providerId?: string | null): V3ImageProvider {
  const envDefault = process.env.V3_IMAGE_PROVIDER?.trim() as V3ImageProviderId | undefined
  const selected = (providerId ?? envDefault ?? 'gpt-image') as V3ImageProviderId
  const provider = PROVIDERS[selected]
  if (!provider) {
    throw new Error(`Unknown V3 image provider "${selected}"`)
  }
  return provider
}

export function listV3ImageProviders(): V3ImageProviderId[] {
  return Object.keys(PROVIDERS) as V3ImageProviderId[]
}
