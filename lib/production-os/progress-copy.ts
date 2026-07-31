import type { ProductionOsPhaseId } from '@/lib/production-os/phases'
import { getProductionOsPhase } from '@/lib/production-os/phases'

/** V4 Thinking Engine lines — never expose technical logs. */
export const PRODUCTION_OS_PROGRESS: Record<ProductionOsPhaseId, string> = {
  idea_discovery: '✨ Understanding your idea…',
  deep_research: '🔍 Researching your topic…',
  creative_direction: '🧠 Building your creative direction…',
  script: '🧠 Building your screenplay…',
  screenplay: '🧠 Building your screenplay…',
  storyboard: '🖼 Generating storyboard…',
  shot_list: '🎬 Directing scenes…',
  voiceover: '🎙 Recording narration…',
  image_generation: '🎨 Designing your world…',
  animation: '🎥 Animating performances…',
  video_editing: '🎞 Editing your movie…',
  music: '🎵 Composing soundtrack…',
  sound_design: '🎵 Composing soundtrack…',
  captions: '🎞 Editing your movie…',
  rendering: '📦 Rendering final export…',
}

export const PRODUCTION_OS_READY_LINE = '🎉 Your movie is ready.'

export function productionOsProgressLine(phase: ProductionOsPhaseId): string {
  return PRODUCTION_OS_PROGRESS[phase] ?? getProductionOsPhase(phase)?.progressLine ?? '✨ Working on your film…'
}
