export type AiTeamMember = {
  id: string
  label: string
  role: string
  personality: string
  unlockLevel: number
  icon: string
}

export const AI_TEAM_ROSTER: AiTeamMember[] = [
  {
    id: 'research',
    label: 'Research Agent',
    role: 'Deep research & fact-checking',
    personality: 'Curious archivist — surfaces sources before you script.',
    unlockLevel: 3,
    icon: '🔍',
  },
  {
    id: 'script',
    label: 'Script Agent',
    role: 'Narrative structure & retention',
    personality: 'Story architect — every beat earns the next.',
    unlockLevel: 1,
    icon: '📝',
  },
  {
    id: 'hook',
    label: 'Hook Agent',
    role: 'Scroll-stopping openers',
    personality: 'Pattern breaker — tests angles until one hits.',
    unlockLevel: 2,
    icon: '🎣',
  },
  {
    id: 'visual',
    label: 'Visual Agent',
    role: 'Cinematic imagery & storyboards',
    personality: 'Frame poet — mood before words.',
    unlockLevel: 8,
    icon: '🎬',
  },
  {
    id: 'voice',
    label: 'Voice Agent',
    role: 'Narration & tone matching',
    personality: 'Vocal director — finds the right register.',
    unlockLevel: 12,
    icon: '🎙️',
  },
  {
    id: 'growth',
    label: 'Growth Agent',
    role: 'Audience & distribution strategy',
    personality: 'Strategist — ships content that compounds.',
    unlockLevel: 15,
    icon: '📈',
  },
  {
    id: 'analytics',
    label: 'Analytics Agent',
    role: 'Performance insights & trends',
    personality: 'Signal reader — turns data into next moves.',
    unlockLevel: 20,
    icon: '📊',
  },
]

export function unlockedTeamMembers(creatorLevel: number): AiTeamMember[] {
  return AI_TEAM_ROSTER.filter((m) => creatorLevel >= m.unlockLevel)
}

export function lockedTeamMembers(creatorLevel: number): AiTeamMember[] {
  return AI_TEAM_ROSTER.filter((m) => creatorLevel < m.unlockLevel)
}

export function nextTeamUnlock(creatorLevel: number): AiTeamMember | null {
  const locked = lockedTeamMembers(creatorLevel).sort((a, b) => a.unlockLevel - b.unlockLevel)
  return locked[0] ?? null
}
