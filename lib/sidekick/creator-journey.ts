export type CreatorJourneyLevel = 'beginner' | 'builder' | 'grower' | 'authority'

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
}

export function resolveCreatorJourney(
  projectsCount = 0,
  generationsCount = 0
): CreatorJourneySnapshot {
  const projects = Math.max(0, projectsCount)
  const generations = Math.max(0, generationsCount)

  let level: CreatorJourneyLevel = 'beginner'
  if (projects >= LEVELS.authority.minProjects || generations >= LEVELS.authority.minGenerations) {
    level = 'authority'
  } else if (projects >= LEVELS.grower.minProjects || generations >= LEVELS.grower.minGenerations) {
    level = 'grower'
  } else if (projects >= LEVELS.builder.minProjects || generations >= LEVELS.builder.minGenerations) {
    level = 'builder'
  }

  const meta = LEVELS[level]
  const next =
    level === 'authority'
      ? null
      : level === 'grower'
        ? LEVELS.authority
        : level === 'builder'
          ? LEVELS.grower
          : LEVELS.builder

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
