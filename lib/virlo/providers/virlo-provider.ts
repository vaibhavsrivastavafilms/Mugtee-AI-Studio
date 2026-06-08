import type { PlatformId } from '@/lib/virlo/types'

export type VirloTrendSignal = {
  topic: string
  framework: string
  hookType: string
  viralityScore: number
  platform: PlatformId
}

export interface VirloProvider {
  platform: PlatformId
  fetchTrends(opts?: { niche?: string; limit?: number }): Promise<VirloTrendSignal[]>
}

const NOT_CONFIGURED = 'Virlo provider not configured'

export class VirloProviderNotConfiguredError extends Error {
  constructor(platform: string) {
    super(`${NOT_CONFIGURED}: ${platform}`)
    this.name = 'VirloProviderNotConfiguredError'
  }
}

function stubProvider(platform: PlatformId): VirloProvider {
  return {
    platform,
    async fetchTrends() {
      throw new VirloProviderNotConfiguredError(platform)
    },
  }
}

export const tiktokVirloProvider = stubProvider('tiktok')
export const instagramVirloProvider = stubProvider('instagram')
export const youtubeShortsVirloProvider = stubProvider('youtube-shorts')
export const xVirloProvider = stubProvider('x')
export const linkedinVirloProvider = stubProvider('linkedin')

export const VIRLO_PROVIDERS: Record<PlatformId, VirloProvider> = {
  tiktok: tiktokVirloProvider,
  instagram: instagramVirloProvider,
  'youtube-shorts': youtubeShortsVirloProvider,
  x: xVirloProvider,
  linkedin: linkedinVirloProvider,
}
