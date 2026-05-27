import { recoverEmotionalRender } from '@/lib/cinematic/execution/render/emotional-render-recovery'
import type { RenderProviderResult } from '@/lib/cinematic/execution/render/cinematic-render-provider'
import { orchestrateRender } from '@/lib/cinematic/execution/render/render-orchestration-engine'
import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'

export async function retryCinematicRender(
  blueprint: CinematicRenderBlueprint,
  attempt = 1
): Promise<RenderProviderResult & { pacingNote?: string }> {
  if (attempt > 2) return recoverEmotionalRender()
  try {
    return await orchestrateRender(blueprint)
  } catch {
    return retryCinematicRender(blueprint, attempt + 1)
  }
}
