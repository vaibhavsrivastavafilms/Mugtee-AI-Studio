import { levelFromXp } from '@/lib/mission/creator-levels'

export type SidekickTier = {
  tier: number
  title: string
  subtitle: string
}

const SIDEKICK_TIERS: SidekickTier[] = [
  { tier: 1, title: 'Intern', subtitle: 'Learning your voice' },
  { tier: 2, title: 'Assistant', subtitle: 'Taking notes on every project' },
  { tier: 3, title: 'Collaborator', subtitle: 'Anticipating your next move' },
  { tier: 4, title: 'Creative Partner', subtitle: 'Shaping stories with you' },
  { tier: 5, title: 'Co-Director', subtitle: 'Calling shots before you ask' },
  { tier: 6, title: 'Executive Producer', subtitle: 'Managing the whole pipeline' },
  { tier: 7, title: 'Studio Chief', subtitle: 'Your creative second brain' },
  { tier: 8, title: 'Master Companion', subtitle: 'Knows your audience deeply' },
  { tier: 9, title: 'Legendary Ally', subtitle: 'Few creators reach this bond' },
  { tier: 10, title: 'Legendary Companion', subtitle: 'A creative soulmate' },
]

/** Sidekick tier 1–10 from creator mission level (1–50 → 1–10). */
export function sidekickTierFromLevel(creatorLevel: number): number {
  const clamped = Math.max(1, Math.min(50, creatorLevel))
  return Math.max(1, Math.min(10, Math.ceil(clamped / 5)))
}

export function sidekickTierFromXp(xp: number): number {
  return sidekickTierFromLevel(levelFromXp(xp).level)
}

export function sidekickTierInfo(tier: number): SidekickTier {
  const clamped = Math.max(1, Math.min(10, tier))
  return SIDEKICK_TIERS[clamped - 1]!
}

export function sidekickCommentaryTone(preset: string): 'direct' | 'warm' | 'energetic' | 'calm' | 'playful' {
  switch (preset) {
    case 'strict_director':
      return 'direct'
    case 'hype_partner':
      return 'energetic'
    case 'calm_strategist':
      return 'calm'
    case 'playful_editor':
      return 'playful'
    default:
      return 'warm'
  }
}

export const SIDEKICK_PERSONALITY_PRESETS = [
  {
    id: 'strict_director' as const,
    label: 'Strict Director',
    description: 'Precise, no-nonsense feedback. Every frame earns its place.',
  },
  {
    id: 'wise_mentor' as const,
    label: 'Wise Mentor',
    description: 'Patient guidance with long-term creative growth in mind.',
  },
  {
    id: 'hype_partner' as const,
    label: 'Hype Partner',
    description: 'High energy, celebrates wins, pushes you to ship.',
  },
  {
    id: 'calm_strategist' as const,
    label: 'Calm Strategist',
    description: 'Data-minded, measured, focused on audience impact.',
  },
  {
    id: 'playful_editor' as const,
    label: 'Playful Editor',
    description: 'Light humour, creative experiments, bold ideas welcome.',
  },
]
