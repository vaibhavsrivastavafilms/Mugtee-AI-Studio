import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import { convertScreenplayToRenderInstructions } from '@/lib/cinematic/execution/render/screenplay-render-conversion'
import {
  resolveRenderProvider,
  selectRenderProviderFromEnv,
  type RenderProviderResult,
} from '@/lib/cinematic/execution/render/cinematic-render-provider'
import { recoverEmotionalRender } from '@/lib/cinematic/execution/render/emotional-render-recovery'

export type RenderOrchestrationResult = RenderProviderResult & {
  pacingNote: string
}

export async function orchestrateRender(
  blueprint: CinematicRenderBlueprint
): Promise<RenderOrchestrationResult> {
  const instructions = convertScreenplayToRenderInstructions(blueprint)
  const provider = resolveRenderProvider(selectRenderProviderFromEnv())

  try {
    const result = await provider.prepare(instructions.intent)
    return { ...result, pacingNote: instructions.pacingNote }
  } catch {
    return { ...recoverEmotionalRender(), pacingNote: instructions.pacingNote }
  }
}
