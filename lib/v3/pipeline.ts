import type { V3AgentId } from '@/types/v3/production'

/** Agents executed automatically after planning (master roadmap order). */
export const V3_RUNNABLE_AGENTS: V3AgentId[] = [
  'research',
  'script',
  'storyboard',
  'character',
  'location',
  'style',
  'prompts',
  'image',
  'video',
  'voice',
  'music',
  'captions',
  'editor',
  'export',
]

/** Next stage after prompt engineering completes. */
export const V3_POST_PROMPTS_STAGE: V3AgentId = 'image'

/** Next stage after image generation completes. */
export const V3_POST_IMAGE_STAGE: V3AgentId = 'video'

/** Next stage after video generation completes. */
export const V3_POST_VIDEO_STAGE: V3AgentId = 'voice'

/** Next stage after export completes (terminal). */
export const V3_POST_CREATIVE_STAGE: V3AgentId = 'export'
