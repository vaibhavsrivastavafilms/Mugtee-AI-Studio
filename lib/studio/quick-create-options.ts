/** Quick Mode composer chips and output targets (V4 mock). */
export const V4_QUICK_PROMPT_CHIPS = [
  'Psychology Reel',
  'Motivational Short',
  'Restaurant Storytelling',
  'Faceless Documentary',
  'Finance Explainer',
] as const

export const QUICK_DURATION_OPTIONS = [
  { value: 30, label: '30 Seconds' },
  { value: 60, label: '60 Seconds' },
] as const

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
  'Faceless Documentary':
    'Create a faceless documentary-style short about a hidden truth that changes perspective.',
  'Finance Explainer':
    'Create a finance explainer reel that simplifies a money mistake most people make.',
}
