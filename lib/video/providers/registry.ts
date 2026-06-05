import { ReplicateProvider, hasReplicateApiToken } from '@/lib/video/providers/replicate-provider'
import {
  HunyuanProvider,
  KlingProvider,
  LtxProvider,
  WanProvider,
} from '@/lib/video/providers/stub-providers'
import type { DirectorVideoProviderId, VideoProvider } from '@/lib/video/providers/video-provider'

export function resolveDirectorVideoProviderId(): DirectorVideoProviderId {
  const forced = process.env.VIDEO_PROVIDER?.trim().toLowerCase() as DirectorVideoProviderId | undefined
  if (forced && ['replicate', 'ltx', 'wan', 'kling', 'hunyuan'].includes(forced)) {
    return forced
  }
  return 'replicate'
}

export function getDirectorVideoProvider(id?: DirectorVideoProviderId | null): VideoProvider {
  const providerId = id ?? resolveDirectorVideoProviderId()

  switch (providerId) {
    case 'replicate':
      return new ReplicateProvider()
    case 'ltx':
      return new LtxProvider()
    case 'wan':
      return new WanProvider()
    case 'kling':
      return new KlingProvider()
    case 'hunyuan':
      return new HunyuanProvider()
    default:
      return new ReplicateProvider()
  }
}

export function isDirectorVideoProviderConfigured(id?: DirectorVideoProviderId | null): boolean {
  const providerId = id ?? resolveDirectorVideoProviderId()
  switch (providerId) {
    case 'replicate':
      return hasReplicateApiToken()
    case 'ltx':
    case 'wan':
    case 'kling':
    case 'hunyuan':
      return false
    default:
      return hasReplicateApiToken()
  }
}
