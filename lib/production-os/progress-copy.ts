import type { ProductionOsPhaseId } from '@/lib/production-os/phases'
import { getProductionOsPhase } from '@/lib/production-os/phases'

/** Canonical creative progress lines — never expose technical logs. */
export const PRODUCTION_OS_PROGRESS: Record<ProductionOsPhaseId, string> = {
  idea_discovery: 'Understanding your idea…',
  deep_research: 'Researching your topic…',
  creative_direction: 'Building your story…',
  script: 'Building your story…',
  screenplay: 'Casting your characters…',
  storyboard: 'Generating storyboard…',
  shot_list: 'Designing your world…',
  voiceover: 'Recording narration…',
  image_generation: 'Designing your world…',
  animation: 'Animating scenes…',
  video_editing: 'Editing your film…',
  music: 'Composing soundtrack…',
  sound_design: 'Composing soundtrack…',
  captions: 'Editing your film…',
  rendering: 'Rendering final movie…',
}

export const PRODUCTION_OS_READY_LINE = 'Your film is ready.'

export function productionOsProgressLine(phase: ProductionOsPhaseId): string {
  return PRODUCTION_OS_PROGRESS[phase] ?? getProductionOsPhase(phase)?.progressLine ?? 'Creating…'
}
