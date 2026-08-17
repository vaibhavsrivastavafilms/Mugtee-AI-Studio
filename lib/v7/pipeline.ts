import type { V7StageId } from '@/types/v7/production'

/** Stages executed automatically after idea analysis. */
export const V7_RUNNABLE_STAGES: V7StageId[] = [
  'research',
  'creative',
  'script',
  'voice',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
]

export const V7_ALL_STAGES: V7StageId[] = ['idea', ...V7_RUNNABLE_STAGES]
