export type CreatorJourneyLevel =
  | 'beginner'
  | 'builder'
  | 'grower'
  | 'authority'
  | 'icon'

export type CreatorJourneySnapshot = {
  level: CreatorJourneyLevel
  label: string
  description: string
  progressHint: string
  projectsCount: number
  generationsCount: number
}

const LEVELS: Record<
  CreatorJourneyLevel,
  { label: string; description: string; minProjects: number; minGenerations: number }
> = {
  beginner: {
    label: 'Beginner',
    description: 'Learning the pipeline — hook to export.',
    minProjects: 0,
    minGenerations: 0,
  },
  builder: {
    label: 'Builder',
    description: 'Shipping drafts and refining your voice.',
    minProjects: 2,
    minGenerations: 5,
  },
  grower: {
    label: 'Grower',
    description: 'Consistent output — audience rhythm forming.',
    minProjects: 8,
    minGenerations: 25,
  },
  authority: {
    label: 'Authority',
    description: 'Deep catalog — you direct, Mugtee accelerates.',
    minProjects: 20,
    minGenerations: 75,
  },
  icon: {
    label: 'Icon',
    description: 'Studio-grade output — your lane is unmistakable.',
    minProjects: 50,
    minGenerations: 200,
  },
}

const LEVEL_ORDER: CreatorJourneyLevel[] = [
  'beginner',
  'builder',
  'grower',
  'authority',
  'icon',
]

export const JOURNEY_UNLOCK_MESSAGES: Record<CreatorJourneyLevel, string> = {
  beginner: 'Welcome — every reel starts with one honest idea.',
  builder: 'Builder unlocked — you\'re shipping drafts consistently.',
  grower: 'Grower unlocked — your audience rhythm is forming.',
  authority: 'Authority unlocked — you direct, Mugtee accelerates.',
  icon: 'Icon unlocked — your lane is unmistakable. Keep directing.',
}

export function resolveCreatorJourney(
  projectsCount = 0,
  generationsCount = 0
): CreatorJourneySnapshot {
  const projects = Math.max(0, projectsCount)
  const generations = Math.max(0, generationsCount)

  let level: CreatorJourneyLevel = 'beginner'
  for (const tier of [...LEVEL_ORDER].reverse()) {
    const meta = LEVELS[tier]
    if (projects >= meta.minProjects || generations >= meta.minGenerations) {
      level = tier
      break
    }
  }

  const meta = LEVELS[level]
  const idx = LEVEL_ORDER.indexOf(level)
  const next = idx < LEVEL_ORDER.length - 1 ? LEVELS[LEVEL_ORDER[idx + 1]] : null

  const progressHint = next
    ? `${Math.max(0, next.minProjects - projects)} projects or ${Math.max(0, next.minGenerations - generations)} generations to ${next.label}`
    : 'You\'re at the top tier — keep directing.'

  return {
    level,
    label: meta.label,
    description: meta.description,
    progressHint,
    projectsCount: projects,
    generationsCount: generations,
  }
}

export function computeGoalProgress(
  goal: string | undefined,
  projectsCount: number
): { percent: number; label: string } {
  const projects = Math.max(0, projectsCount)
  const g = goal?.trim() || 'consistency'

  const targets: Record<string, { target: number; label: string }> = {
    grow: { target: 12, label: 'Monthly publish rhythm' },
    monetize: { target: 4, label: 'Monetizable drafts shipped' },
    authority: { target: 10, label: 'Deep-dive projects' },
    consistency: { target: 8, label: 'Weekly consistency streak' },
    learn: { target: 3, label: 'Full pipeline completions' },
  }

  const pack = targets[g] ?? targets.consistency
  const percent = Math.min(100, Math.round((projects / pack.target) * 100))
  return { percent, label: pack.label }
}
