import type { CinematicNiche } from '@/lib/cinematic/niches'

export const NARRATIVE_FRAMEWORK_IDS = [
  'documentary',
  'psychology',
  'business',
  'motivation',
  'storytelling',
] as const

export type NarrativeFrameworkId = (typeof NARRATIVE_FRAMEWORK_IDS)[number]

export type NarrativeFramework = {
  id: NarrativeFrameworkId
  label: string
  beatStructure: readonly string[]
  hookStyle: string
  pacing: string
  promptDirective: string
}

export const NARRATIVE_FRAMEWORKS: Record<NarrativeFrameworkId, NarrativeFramework> = {
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    beatStructure: ['witness hook', 'context stakes', 'evidence beat', 'turning point', 'verdict'],
    hookStyle: 'Start with a concrete observation or on-the-ground detail — not a thesis statement.',
    pacing: 'Measured, evidence-led; each beat adds a new fact or scene.',
    promptDirective:
      'Use a documentary arc: witness the subject, establish stakes, present evidence, reveal the turn, land a clear verdict. Voice should feel observational and credible.',
  },
  psychology: {
    id: 'psychology',
    label: 'Psychology',
    beatStructure: ['pattern interrupt', 'hidden mechanism', 'recognition moment', 'reframe', 'actionable insight'],
    hookStyle: 'Name a behavior the viewer recognizes in themselves before explaining why.',
    pacing: 'Tension through recognition — slow reveal of the mechanism behind the behavior.',
    promptDirective:
      'Use a psychology arc: interrupt with a relatable behavior, expose the hidden mechanism, mirror the viewer, reframe the story, close with one actionable insight.',
  },
  business: {
    id: 'business',
    label: 'Business',
    beatStructure: ['problem cost', 'counterintuitive insight', 'framework', 'proof beat', 'decision CTA'],
    hookStyle: 'Lead with the cost of the status quo — time, money, or missed leverage.',
    pacing: 'Crisp and decision-oriented; every beat moves toward a clear takeaway.',
    promptDirective:
      'Use a business arc: quantify the problem, challenge conventional advice, introduce a simple framework, show proof, end with a decision the viewer can make today.',
  },
  motivation: {
    id: 'motivation',
    label: 'Motivation',
    beatStructure: ['identity tension', 'low point', 'shift', 'momentum beat', 'identity CTA'],
    hookStyle: 'Open on the gap between who they are and who they want to become.',
    pacing: 'Emotional lift — each beat raises stakes then offers forward motion.',
    promptDirective:
      'Use a motivation arc: surface identity tension, show the low point, introduce the shift, build momentum, close by inviting the viewer into a new identity.',
  },
  storytelling: {
    id: 'storytelling',
    label: 'Storytelling',
    beatStructure: ['hook image', 'setup', 'conflict', 'climax', 'resolution'],
    hookStyle: 'Drop the viewer into a vivid moment — sensory detail over explanation.',
    pacing: 'Cinematic story rhythm; scenes escalate toward one memorable turn.',
    promptDirective:
      'Use a storytelling arc: vivid hook image, setup the world, introduce conflict, peak at climax, resolve with a line the viewer remembers.',
  },
}

const NICHE_FRAMEWORK_PREFS: Partial<Record<CinematicNiche, NarrativeFrameworkId[]>> = {
  documentary: ['documentary', 'storytelling', 'psychology'],
  psychology: ['psychology', 'documentary', 'motivation'],
  motivation: ['motivation', 'storytelling', 'psychology'],
  storytelling: ['storytelling', 'documentary', 'motivation'],
  finance: ['business', 'documentary', 'psychology'],
  luxury: ['storytelling', 'documentary', 'business'],
  fitness: ['motivation', 'psychology', 'storytelling'],
  spirituality: ['storytelling', 'motivation', 'documentary'],
  'faceless reels': ['documentary', 'motivation', 'storytelling'],
}

export type SelectedNarrativeFramework = NarrativeFramework & {
  rotationIndex: number
}

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function normalizeNarrativeFrameworkId(
  raw: string | null | undefined
): NarrativeFrameworkId | null {
  const id = (raw ?? '').trim().toLowerCase() as NarrativeFrameworkId
  return NARRATIVE_FRAMEWORK_IDS.includes(id) ? id : null
}

export function selectNarrativeFramework(
  niche: CinematicNiche | string | undefined,
  sessionHistory: readonly string[] = [],
  sessionSeed?: string | number
): SelectedNarrativeFramework {
  const locked = (niche ?? 'storytelling') as CinematicNiche
  const prefs =
    NICHE_FRAMEWORK_PREFS[locked] ??
    NICHE_FRAMEWORK_PREFS.storytelling ??
    NARRATIVE_FRAMEWORK_IDS

  const recent = sessionHistory
    .map((id) => normalizeNarrativeFrameworkId(id))
    .filter((id): id is NarrativeFrameworkId => Boolean(id))
  const lastUsed = recent[recent.length - 1]

  const seed = hashSeed(`${sessionSeed ?? ''}:${locked}:${recent.join('|')}`)
  const rotated = [
    ...prefs.slice(seed % prefs.length),
    ...prefs.slice(0, seed % prefs.length),
  ]

  let picked = rotated.find((id) => id !== lastUsed) ?? rotated[0] ?? 'storytelling'
  if (recent.filter((id) => id === picked).length >= 2) {
    picked = rotated.find((id) => !recent.slice(-3).includes(id)) ?? picked
  }

  const framework = NARRATIVE_FRAMEWORKS[picked]
  return { ...framework, rotationIndex: prefs.indexOf(picked) }
}

export function buildNarrativeFrameworkPromptSection(
  framework: SelectedNarrativeFramework
): string {
  return [
    `NARRATIVE FRAMEWORK: ${framework.label}`,
    `Arc beats: ${framework.beatStructure.join(' → ')}`,
    `Hook style: ${framework.hookStyle}`,
    `Pacing: ${framework.pacing}`,
    framework.promptDirective,
    'Follow this framework for scene order and spoken narration — do not label beats in the output.',
  ].join('\n')
}

export const NARRATIVE_FRAMEWORK_MEMORY_KEY = 'mugtee:narrative-frameworks:v1'
const MAX_RECENT_FRAMEWORKS = 8

export function loadRecentNarrativeFrameworks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(NARRATIVE_FRAMEWORK_MEMORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { ids?: unknown }
    if (!Array.isArray(parsed.ids)) return []
    return parsed.ids
      .filter((id): id is string => typeof id === 'string')
      .slice(-MAX_RECENT_FRAMEWORKS)
  } catch {
    return []
  }
}

export function recordNarrativeFrameworkUsage(id: NarrativeFrameworkId): void {
  if (typeof window === 'undefined') return
  try {
    const recent = loadRecentNarrativeFrameworks().filter((x) => x !== id)
    recent.push(id)
    window.localStorage.setItem(
      NARRATIVE_FRAMEWORK_MEMORY_KEY,
      JSON.stringify({ ids: recent.slice(-MAX_RECENT_FRAMEWORKS) })
    )
  } catch {
    /* quota or private mode */
  }
}

