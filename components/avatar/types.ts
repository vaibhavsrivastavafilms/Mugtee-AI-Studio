/** Mugtee Live Companion avatar states — drives R3F animation + UI affordances. */
export type MugteeAvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'celebrating'
  | 'warning'

export const MUGTEE_AVATAR_STATES: MugteeAvatarState[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'happy',
  'celebrating',
  'warning',
]

export type MugteeAvatarSize = 'sm' | 'md' | 'lg' | 'hero'

export const MUGTEE_AVATAR_SIZE_PX: Record<MugteeAvatarSize, number> = {
  sm: 48,
  md: 96,
  lg: 160,
  hero: 320,
}
