import type {
  SceneVideoInput,
  SceneVideoResult,
  VideoProvider,
  DirectorVideoProviderId,
} from '@/lib/video/providers/video-provider'

function notConfigured(name: DirectorVideoProviderId): never {
  throw new Error(`${name} video provider is not configured`)
}

export class LtxProvider implements VideoProvider {
  readonly name = 'ltx' as const
  async generateSceneVideo(_input: SceneVideoInput): Promise<SceneVideoResult> {
    return notConfigured('ltx')
  }
}

export class WanProvider implements VideoProvider {
  readonly name = 'wan' as const
  async generateSceneVideo(_input: SceneVideoInput): Promise<SceneVideoResult> {
    return notConfigured('wan')
  }
}

export class KlingProvider implements VideoProvider {
  readonly name = 'kling' as const
  async generateSceneVideo(_input: SceneVideoInput): Promise<SceneVideoResult> {
    return notConfigured('kling')
  }
}

export class HunyuanProvider implements VideoProvider {
  readonly name = 'hunyuan' as const
  async generateSceneVideo(_input: SceneVideoInput): Promise<SceneVideoResult> {
    return notConfigured('hunyuan')
  }
}
