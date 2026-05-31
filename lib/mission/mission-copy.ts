import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

/** Mission-style loading copy — replaces generic pipeline labels. */
export const MISSION_STEP_LABELS: Record<QuickCutGenerationStep, string> = {
  idle: '',
  analyzing: 'Mugtee is reading your audience brief…',
  title: 'Mugtee is discovering your story angle…',
  hook: 'Mugtee is crafting your scroll-stopping hook…',
  script: 'Mugtee is directing your next viral story.',
  scenes: 'Mugtee is building your scene breakdown…',
  images: 'Mugtee is generating cinematic visuals…',
  motion: 'Mugtee is applying cinematic motion…',
  voice: 'Mugtee is creating your voiceover…',
  render: 'Mugtee is rendering your reel…',
  complete: 'Your cinematic video is ready',
  error: 'Generation paused',
}

export function missionStatusLabel(
  step?: QuickCutGenerationStep,
  sceneCount = 0,
  directingLabel?: string | null
): string {
  if (directingLabel) return directingLabel
  if (!step || step === 'idle') return 'Mugtee is directing your next viral story.'
  if (step === 'scenes' || sceneCount > 0) return 'Mugtee is building your scene breakdown…'
  return MISSION_STEP_LABELS[step] || 'Mugtee is directing your next viral story.'
}
