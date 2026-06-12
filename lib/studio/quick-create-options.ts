/** Quick Mode composer chips (reference UX). */
export const V4_QUICK_PROMPT_CHIPS = [
  'Psychology Reel',
  'Motivational Short',
  'Restaurant Storytelling',
  'Daily Habits',
  'Business Reel',
  'History Reel',
] as const

export const QUICK_DURATION_OPTIONS = [
  { value: 15, label: '15 Seconds' },
  { value: 30, label: '30 Seconds' },
  { value: 60, label: '60 Seconds' },
] as const

export { GENERATION_MODE_LABELS, GENERATION_MODES } from '@/lib/economics/generation-mode'
export type { GenerationMode } from '@/lib/economics/generation-mode'

export type QuickPlatformValue = 'instagram_reel' | 'youtube_short' | 'youtube_video'

export const QUICK_PLATFORM_OPTIONS: { value: QuickPlatformValue; label: string }[] = [
  { value: 'youtube_short', label: 'YouTube Shorts' },
  { value: 'instagram_reel', label: 'Instagram Reel' },
  { value: 'youtube_video', label: 'YouTube Video' },
]

export const QUICK_CHIP_SEEDS: Record<string, string> = {
  'Psychology Reel':
    'Create a psychology reel about how to stop overthinking and find calm in daily life.',
  'Motivational Short':
    'Create a motivational short about discipline, self-belief, and showing up every day.',
  'Restaurant Storytelling':
    'Create a cinematic restaurant storytelling reel about legacy, flavor, and belonging.',
  'Daily Habits':
    'Create a daily habits reel about small routines that compound into life-changing results.',
  'Business Reel':
    'Create a business reel that explains one high-leverage lesson for entrepreneurs.',
  'History Reel':
    'Create a history reel that reveals a surprising story most people never learned.',
}

export const QUICK_TONE_OPTIONS = [
  { value: 'cinematic_emotional', label: 'Cinematic Emotional' },
  { value: 'cinematic', label: 'Cinematic Documentary' },
  { value: 'motivational', label: 'Motivational' },
  { value: 'educational', label: 'Educational' },
  { value: 'storytelling', label: 'Storytelling' },
] as const

export const QUICK_AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General Audience' },
  { value: 'gen_z', label: 'Gen Z / Short-form' },
  { value: 'professionals', label: 'Professionals' },
  { value: 'founders', label: 'Founders & Creators' },
  { value: 'wellness', label: 'Wellness Seekers' },
] as const

export const PROMPT_MAX_CHARS = 500
