export const isDirectorCutLocked = true

export const DIRECTOR_CUT_FEATURES = [
  'Scene-by-scene directing',
  'Cinematic pacing engine',
  'Storyboard editing',
  'Voice refinement',
  'Reel compilation',
  'Premium export pipeline',
] as const

export const DIRECTOR_CUT_LOCKED_COPY = {
  label: 'Director Cut',
  headline: 'Full cinematic control.',
  subtext:
    'Scene-by-scene directing, pacing refinement, storyboard editing, and cinematic compilation.',
  premiumLabel: 'Studio Pro Exclusive',
  badges: ['Studio Pro', 'Coming Soon', 'Premium Workflow'] as const,
  unlockCta: 'Unlock Director Cut',
  modalTitle: 'Director Cut is reserved for cinematic creators.',
  modalBody:
    'Unlock advanced story direction, emotional pacing control, and premium cinematic exports.',
  upgradeCta: 'Upgrade to Studio Pro',
  waitlistCta: 'Join Waitlist',
  upgradeHref: '/pricing',
  waitlistStorageKey: 'mugtee:director-cut-waitlist',
} as const

export function isDirectorCutWaitlisted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(DIRECTOR_CUT_LOCKED_COPY.waitlistStorageKey) === '1'
  } catch {
    return false
  }
}

export function joinDirectorCutWaitlist(): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(DIRECTOR_CUT_LOCKED_COPY.waitlistStorageKey, '1')
    return true
  } catch {
    return false
  }
}
