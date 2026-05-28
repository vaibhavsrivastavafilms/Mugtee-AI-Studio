import { NICHE_PROFILES, type CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'

const STYLE_IDENTITY: Record<string, { tone: string; pacing: string; rhythm: string }> = {
  cinematic: {
    tone: 'Warm cinematic palette',
    pacing: 'Measured cinematic pacing',
    rhythm: 'Visual rhythm preserved',
  },
  emotional: {
    tone: 'High emotional tension',
    pacing: 'Emotional cadence',
    rhythm: 'Feeling-led rhythm',
  },
  documentary: {
    tone: 'Documentary realism',
    pacing: 'Documentary pacing',
    rhythm: 'Observational rhythm',
  },
  motivational: {
    tone: 'Motivational arc',
    pacing: 'Momentum-led pacing',
    rhythm: 'Momentum-driven beats',
  },
}

const NICHE_IDENTITY: Partial<
  Record<CinematicNiche, { tone: string; pacing: string; rhythm: string }>
> = {
  documentary: {
    tone: 'Documentary realism',
    pacing: 'Documentary pacing',
    rhythm: 'Slow-burn observational rhythm',
  },
  psychology: {
    tone: 'Psychological tension style',
    pacing: 'Emotional cadence',
    rhythm: 'Pattern-reveal rhythm',
  },
  luxury: {
    tone: 'Luxury cinematic tone',
    pacing: 'Quiet luxury pacing',
    rhythm: 'Restrained visual rhythm',
  },
  spirituality: {
    tone: 'Spiritual slow-burn tone',
    pacing: 'Slow-burn emotional rhythm',
    rhythm: 'Contemplative pacing',
  },
  storytelling: {
    tone: 'Narrative cinematic tone',
    pacing: 'Story-led pacing',
    rhythm: 'Arc-driven rhythm',
  },
}

export function resolveCreatorIdentity(style?: string | null, niche?: string | null) {
  const nicheKey = niche as CinematicNiche | undefined
  const nicheProfile = nicheKey ? NICHE_PROFILES[nicheKey] : null
  const nicheIdentity = nicheKey ? NICHE_IDENTITY[nicheKey] : null
  const styleIdentity = style ? STYLE_IDENTITY[style] : null

  return {
    label: nicheProfile?.label ?? (style ? capitalize(style) : 'Cinematic'),
    tone: nicheIdentity?.tone ?? styleIdentity?.tone ?? 'Directed cinematic tone',
    pacing: nicheIdentity?.pacing ?? styleIdentity?.pacing ?? 'Your pacing identity',
    rhythm: nicheIdentity?.rhythm ?? styleIdentity?.rhythm ?? 'Visual storytelling rhythm',
    nicheLabel: nicheProfile?.label,
    styleLabel: style ? capitalize(style) : undefined,
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function getCreatorSignatureLine(style?: string | null, niche?: string | null): string {
  const id = resolveCreatorIdentity(style, niche)
  if (id.nicheLabel) return `Your ${id.nicheLabel.toLowerCase()} directing style`
  if (id.styleLabel) return `Your ${id.styleLabel.toLowerCase()} cinematic identity`
  return 'Your directing identity'
}

const CONTINUITY_MEMORY_LINES = [
  'Your film world still breathes here.',
  'The atmosphere you shaped remains alive.',
  'Visual tone continuity held across your arc.',
  'Your pacing signature carries forward.',
  'Scene rhythm remembered — the world waits.',
] as const

export function getContinuityMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const tailored = [
    `${id.pacing} · still present in this world.`,
    `Maintaining your ${id.rhythm.toLowerCase()}.`,
    `${id.tone} · atmosphere remembered.`,
    CONTINUITY_MEMORY_LINES[seed % CONTINUITY_MEMORY_LINES.length],
  ]
  return tailored[seed % tailored.length]
}

const SESSION_RETURN_LINES: Partial<Record<string, string[]>> = {
  preview: [
    'Your screenplay world is still unfolding.',
    'Hook tension held — the lens awaits your return.',
  ],
  director: [
    'Your directing atmosphere is still alive.',
    'The mood world you shaped waits for you.',
  ],
  scenes: [
    'Your visual story-world remains in motion.',
    'Storyboard rhythm preserved — frames still breathing.',
  ],
  voiceover: [
    'Voice arc aligned to your directing signature.',
    'Narration rhythm held in the world you built.',
  ],
  compile: [
    'Your film world nears its final breath.',
    'The showcase sequence waits in cinematic form.',
  ],
}

export function getSessionReturnLine(
  status: CinematicProjectStatus | string,
  style?: string | null,
  seed = 0
): string {
  const pool = SESSION_RETURN_LINES[status] ?? [
    'Your cinematic world is still alive here.',
    'Return to the story atmosphere you were shaping.',
  ]
  const id = resolveCreatorIdentity(style, null)
  const stylePool = [`Re-enter your ${id.label.toLowerCase()} film world.`]
  const combined = [...pool, ...stylePool]
  return combined[seed % combined.length]
}

export function getExportIdentityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const lines = [
    `Your ${id.label.toLowerCase()} world endures in rhythm.`,
    'Visual pacing continuity preserved through time.',
    'Showcase reflects your directed atmosphere.',
  ]
  return lines[seed % lines.length]
}

export function getPreviousSceneEcho(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null
): string | null {
  if (sceneIndex <= 1) return null
  const id = resolveCreatorIdentity(style, niche)
  return `Echoing ${id.rhythm.toLowerCase()} from Scene ${sceneIndex - 1}`
}

export function getToneMemoryLine(style?: string | null, niche?: string | null): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · remembered`
}

export function getWorkflowMemorySummary(
  style?: string | null,
  niche?: string | null
): { headline: string; detail: string } {
  const id = resolveCreatorIdentity(style, niche)
  return {
    headline: `${id.label} film world`,
    detail: `${id.pacing} · ${id.rhythm} · remembered`,
  }
}
