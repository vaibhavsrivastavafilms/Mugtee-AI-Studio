import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import type {
  CinematicRenderIntent,
  CinematicRenderProviderId,
} from '@/lib/cinematic/execution/render/cinematic-render-intent'
import type { CinematicFilmRealization } from '@/lib/cinematic/execution/render/cinematic-film-assembler'
import type { PreviewRhythmMetadata } from '@/lib/cinematic/render/preview-rhythm'

export type RenderProviderContext = {
  blueprint: CinematicRenderBlueprint
  rhythm: PreviewRhythmMetadata
  filmRealization: CinematicFilmRealization
}

export type RenderProviderResult = {
  ok: boolean
  status: 'preparing' | 'queued' | 'complete' | 'unavailable'
  presenceLine: string
  provider: CinematicRenderProviderId
  /** Internal assembly metadata — never shown in UI */
  filmRealization?: CinematicFilmRealization
}

export interface CinematicRenderProvider {
  id: CinematicRenderProviderId
  prepare(
    intent: CinematicRenderIntent,
    context?: RenderProviderContext
  ): Promise<RenderProviderResult>
}

const STUB_PRESENCE = 'Your cinematic world is gathering motion.'

export const stubRenderProvider: CinematicRenderProvider = {
  id: 'stub',
  async prepare(_intent, context) {
    const realization = context?.filmRealization
    const segmentCount = realization?.sceneSegments.length ?? 0
    const presenceLine =
      segmentCount >= 10
        ? 'Your long-form cinematic arc is assembling with held breath.'
        : segmentCount > 1
          ? 'Beats align — motion gathers across your sequence.'
          : STUB_PRESENCE

    return {
      ok: true,
      status: realization?.ready ? 'complete' : 'preparing',
      presenceLine,
      provider: 'stub',
      filmRealization: realization,
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
