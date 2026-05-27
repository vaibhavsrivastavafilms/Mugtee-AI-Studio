import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import { orchestrateRender } from '@/lib/cinematic/execution/render/render-orchestration-engine'
import { continuitySafeRender } from '@/lib/cinematic/execution/render/continuity-safe-render'

export async function renderCinematicFilm(
  blueprint: CinematicRenderBlueprint
) {
  const safe = continuitySafeRender(blueprint)
  if (!safe.canProceed) {
    return {
      ok: true,
      status: 'preparing' as const,
      presenceLine: safe.presenceLine,
      provider: 'stub' as const,
      pacingNote: blueprint.narrationRhythm,
    }
  }
  return orchestrateRender(blueprint)
}
