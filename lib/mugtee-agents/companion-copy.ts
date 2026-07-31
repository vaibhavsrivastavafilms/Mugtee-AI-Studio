/**
 * Creator-facing companion lines only — never expose prompts or stack.
 */

import type { MugteeAgentId } from '@/lib/mugtee-agents/types'

export const AGENT_COMPANION_LINES: Record<MugteeAgentId, string> = {
  idea_analyzer: '✨ Understanding your idea...',
  story_engine: '🧠 Writing your story...',
  screenplay_engine: '🧠 Writing your story...',
  character_director: '🎭 Designing characters...',
  environment_director: '🎨 Building your world...',
  storyboard_engine: '🖼 Creating storyboard...',
  prompt_engine: '🖼 Creating storyboard...',
  image_engine: '🖼 Creating storyboard...',
  video_engine: '🎬 Animating scenes...',
  audio_engine: '🎙 Recording voices...',
  editor: '🎞 Editing your movie...',
  quality_engine: '🎞 Editing your movie...',
  export_engine: '📦 Rendering final film...',
}

export const COMPANION_MUSIC_LINE = '🎵 Composing soundtrack...'
export const COMPANION_READY_LINE = '🎉 Your movie is ready.'

export function companionLineForAgent(agent: MugteeAgentId): string {
  return AGENT_COMPANION_LINES[agent]
}

/** Ordered companion sequence the creator should experience. */
export const CREATOR_EXPERIENCE_SEQUENCE = [
  AGENT_COMPANION_LINES.idea_analyzer,
  AGENT_COMPANION_LINES.story_engine,
  AGENT_COMPANION_LINES.character_director,
  AGENT_COMPANION_LINES.environment_director,
  AGENT_COMPANION_LINES.storyboard_engine,
  AGENT_COMPANION_LINES.video_engine,
  AGENT_COMPANION_LINES.audio_engine,
  COMPANION_MUSIC_LINE,
  AGENT_COMPANION_LINES.editor,
  AGENT_COMPANION_LINES.export_engine,
  COMPANION_READY_LINE,
] as const
