import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import {
  assembleCinematicFilm,
  type CinematicFilmRealization,
} from '@/lib/cinematic/execution/render/cinematic-film-assembler'
import { convertScreenplayToRenderInstructions } from '@/lib/cinematic/execution/render/screenplay-render-conversion'
import {
  resolveRenderProvider,
  selectRenderProviderFromEnv,
  type RenderProviderResult,
} from '@/lib/cinematic/execution/render/cinematic-render-provider'
import { recoverEmotionalRender } from '@/lib/cinematic/execution/render/emotional-render-recovery'
import { buildPreviewRhythmFromBlueprint } from '@/lib/cinematic/render/preview-rhythm'

export type RenderOrchestrationResult = RenderProviderResult & {
  pacingNote: string
  filmRealization: CinematicFilmRealization
}

export async function orchestrateRender(
  blueprint: CinematicRenderBlueprint,
  options?: { projectId?: string }
): Promise<RenderOrchestrationResult> {
  const instructions = convertScreenplayToRenderInstructions(blueprint)
  const rhythm = buildPreviewRhythmFromBlueprint(blueprint)
  const filmRealization = assembleCinematicFilm(
    blueprint,
    rhythm,
    instructions.intent,
    options
  )
  const provider = resolveRenderProvider(selectRenderProviderFromEnv())

  try {
    const result = await provider.prepare(instructions.intent, {
      blueprint,
      rhythm,
      filmRealization,
    })
    return { ...result, pacingNote: instructions.pacingNote, filmRealization }
  } catch {
    return {
      ...recoverEmotionalRender(),
      pacingNote: instructions.pacingNote,
      filmRealization,
    }
  }
}
