import type {
  CinematicRenderIntent,
  CinematicRenderProviderId,
} from '@/lib/cinematic/execution/render/cinematic-render-intent'

export type RenderProviderResult = {
  ok: boolean
  status: 'preparing' | 'queued' | 'complete' | 'unavailable'
  presenceLine: string
  provider: CinematicRenderProviderId
}

export interface CinematicRenderProvider {
  id: CinematicRenderProviderId
  prepare(intent: CinematicRenderIntent): Promise<RenderProviderResult>
}

const STUB_PRESENCE = 'Your cinematic world is gathering motion.'

export const stubRenderProvider: CinematicRenderProvider = {
  id: 'stub',
  async prepare() {
    return {
      ok: true,
      status: 'preparing',
      presenceLine: STUB_PRESENCE,
      provider: 'stub',
    }
  },
}

const PROVIDER_REGISTRY: Partial<Record<CinematicRenderProviderId, CinematicRenderProvider>> = {
  stub: stubRenderProvider,
}

export function resolveRenderProvider(
  id: CinematicRenderProviderId = 'stub'
): CinematicRenderProvider {
  return PROVIDER_REGISTRY[id] ?? stubRenderProvider
}

export function selectRenderProviderFromEnv(): CinematicRenderProviderId {
  const raw = process.env.CINEMATIC_RENDER_PROVIDER?.toLowerCase()
  if (raw && raw in PROVIDER_REGISTRY) return raw as CinematicRenderProviderId
  return 'stub'
}
