export type DirectorMode =
  | 'storyteller'
  | 'viral-creator'
  | 'documentary'
  | 'personal-brand'

export const DEFAULT_DIRECTOR_MODE: DirectorMode = 'storyteller'

export type DirectorModeOption = {
  id: DirectorMode
  label: string
  description: string
  directive: string
}

export const DIRECTOR_MODES: DirectorModeOption[] = [
  {
    id: 'storyteller',
    label: 'Storyteller',
    description: 'Emotional hooks, cinematic scenes, narrative storytelling',
    directive: [
      'AI DIRECTOR MODE: Storyteller',
      'Lead with emotional hooks and cinematic scene progression.',
      'Prioritize narrative arc, character feeling, and visual poetry over raw facts.',
      'Pacing should breathe — tension, release, and a memorable emotional payoff.',
    ].join('\n'),
  },
  {
    id: 'viral-creator',
    label: 'Viral Creator',
    description: 'Retention focused, strong opening hooks, social-first pacing',
    directive: [
      'AI DIRECTOR MODE: Viral Creator',
      'Optimize for scroll-stop retention on short-form social (Reels, Shorts, TikTok).',
      'Open with a pattern-interrupt hook in the first 2 seconds.',
      'Use rapid beat changes, curiosity gaps, and payoff teases every 5–8 seconds.',
      'End with a shareable takeaway or cliffhanger CTA.',
    ].join('\n'),
  },
  {
    id: 'documentary',
    label: 'Documentary',
    description: 'Educational structure, authority-driven narration, historical/business storytelling',
    directive: [
      'AI DIRECTOR MODE: Documentary',
      'Structure content as authoritative, educational long-form documentary.',
      'Lead with context, evidence, and expert tone — historical or business storytelling welcome.',
      'Use clear chapter beats: setup → investigation → revelation → implications.',
      'Narration should sound credible, researched, and informative without sensationalism.',
    ].join('\n'),
  },
  {
    id: 'personal-brand',
    label: 'Personal Brand',
    description: 'First-person perspective, lessons and insights, audience connection',
    directive: [
      'AI DIRECTOR MODE: Personal Brand',
      'Write in first-person perspective — the creator speaking directly to their audience.',
      'Share lessons, insights, and personal stakes that build trust and connection.',
      'Tone: conversational expert — vulnerable when useful, confident without arrogance.',
      'Frame the topic through lived experience and actionable takeaways for the viewer.',
    ].join('\n'),
  },
]

const STORAGE_KEY = 'mugtee:director-mode:v1'

const MODE_IDS = new Set<string>(DIRECTOR_MODES.map((m) => m.id))

export function normalizeDirectorMode(raw?: unknown): DirectorMode {
  if (typeof raw === 'string' && MODE_IDS.has(raw)) {
    return raw as DirectorMode
  }
  return DEFAULT_DIRECTOR_MODE
}

export function directorModeById(id: DirectorMode): DirectorModeOption {
  return DIRECTOR_MODES.find((m) => m.id === id) ?? DIRECTOR_MODES[0]
}

export function directorModeDirective(mode?: DirectorMode | string | null): string {
  return directorModeById(normalizeDirectorMode(mode)).directive
}

export function loadDirectorModePreference(): DirectorMode {
  if (typeof window === 'undefined') return DEFAULT_DIRECTOR_MODE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DIRECTOR_MODE
    return normalizeDirectorMode(raw)
  } catch {
    return DEFAULT_DIRECTOR_MODE
  }
}

export function saveDirectorModePreference(mode: DirectorMode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* quota / private mode */
  }
}

export function extractDirectorModeFromCaptions(
  captions: unknown
): DirectorMode | undefined {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) {
    return undefined
  }
  const raw = (captions as Record<string, unknown>).directorMode
  if (typeof raw !== 'string' || !MODE_IDS.has(raw)) return undefined
  return raw as DirectorMode
}
