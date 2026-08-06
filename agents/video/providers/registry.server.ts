import 'server-only'



import type { V3VideoProvider, V3VideoProviderId } from '@/agents/video/provider'

import { veoVideoProvider } from '@/agents/video/providers/veo.server'

import { runwayVideoProvider } from '@/agents/video/providers/runway.server'



function stubProvider(id: V3VideoProviderId): V3VideoProvider {

  return {

    id,

    async generate() {

      throw new Error(

        `${id} provider is not implemented yet. Set V3_VIDEO_PROVIDER=veo and configure GEMINI_API_KEY.`

      )

    },

  }

}



const PROVIDERS: Record<V3VideoProviderId, V3VideoProvider> = {

  veo: veoVideoProvider,

  runway: runwayVideoProvider,

  kling: stubProvider('kling'),

  pika: stubProvider('pika'),

  luma: stubProvider('luma'),

  hailuo: stubProvider('hailuo'),

}



export function resolveV3VideoProvider(providerId?: string | null): V3VideoProvider {

  const envDefault = process.env.V3_VIDEO_PROVIDER?.trim() as V3VideoProviderId | undefined

  const selected = (providerId ?? envDefault ?? 'veo') as V3VideoProviderId

  const provider = PROVIDERS[selected]

  if (!provider) {

    throw new Error(`Unknown V3 video provider "${selected}"`)

  }

  return provider

}



export function listV3VideoProviders(): V3VideoProviderId[] {

  return Object.keys(PROVIDERS) as V3VideoProviderId[]

}


