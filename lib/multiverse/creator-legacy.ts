/** Stub — 100-project documentary legacy report template + memory summary */

export type LegacyReportInput = {
  creatorName?: string | null
  projectCount: number
  totalExports: number
  bestStoryScore: number
  commonThemes?: string[]
  worldLabel?: string | null
}

export type LegacyReport = {
  title: string
  subtitle: string
  sections: Array<{ heading: string; body: string }>
  ready: boolean
}

const LEGACY_PROJECT_THRESHOLD = 100

export function buildCreatorLegacyReport(input: LegacyReportInput): LegacyReport {
  const name = input.creatorName?.trim() || 'Creator'
  const ready = input.projectCount >= LEGACY_PROJECT_THRESHOLD

  const sections: LegacyReport['sections'] = [
    {
      heading: 'Creative journey',
      body: ready
        ? `${name} completed ${input.projectCount} projects across ${input.worldLabel ?? 'multiple worlds'}.`
        : `${input.projectCount} of ${LEGACY_PROJECT_THRESHOLD} projects toward your documentary legacy.`,
    },
    {
      heading: 'Signature themes',
      body:
        input.commonThemes?.length ?
          `Recurring themes: ${input.commonThemes.slice(0, 5).join(', ')}.`
        : 'Complete more projects — Mugtee will surface your signature themes.',
    },
    {
      heading: 'Peak performance',
      body:
        input.bestStoryScore > 0 ?
          `Best story score: ${input.bestStoryScore}. Total exports: ${input.totalExports}.`
        : 'Export your first reel to begin tracking peak performance.',
    },
    {
      heading: 'Memory summary',
      body: ready ?
        'Full memory graph analysis and audience evolution timeline — coming in Creator Legacy V2.'
      : 'Your companion is building a memory graph from every hook, script, and export.',
    },
  ]

  return {
    title: ready ? `${name}'s Creator Documentary` : 'Creator Legacy (in progress)',
    subtitle: ready ?
      'A 100-project retrospective — your creative autobiography.'
    : `${LEGACY_PROJECT_THRESHOLD - input.projectCount} projects until your legacy documentary unlocks.`,
    sections,
    ready,
  }
}

export const LEGACY_THRESHOLD = LEGACY_PROJECT_THRESHOLD
