import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { ScriptArchetypeId } from '@/lib/cinematic/script-archetypes'

export const RECENT_CONTENT_ANGLES_KEY = 'mugtee:recent-content-angles:v1'
export const RECENT_CONTENT_ANGLES_MAX = 5

export const CONTENT_ANGLE_IDS = [
  'story',
  'documentary',
  'contrarian',
  'investigation',
  'myth_busting',
  'dark_psychology',
  'emotional',
  'authority',
  'case_study',
  'challenge',
  'prediction',
  'historical_parallel',
  'personal_revelation',
  'warning',
  'unexpected_truth',
] as const

export type ContentAngleId = (typeof CONTENT_ANGLE_IDS)[number]

export type ContentAngle = {
  id: ContentAngleId
  label: string
  directive: string
  archetypePrefs: ScriptArchetypeId[]
}

export const CONTENT_ANGLES: Record<ContentAngleId, ContentAngle> = {
  story: {
    id: 'story',
    label: 'Story',
    directive:
      'Lead with a personal or character-driven narrative — setup, turn, and lesson. Avoid listicle framing.',
    archetypePrefs: ['story', 'documentary', 'case_study'],
  },
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    directive:
      'Observational vérité tone — witness detail, evidence, quiet revelation. Not preachy or hype.',
    archetypePrefs: ['documentary', 'story', 'myth_busting'],
  },
  contrarian: {
    id: 'contrarian',
    label: 'Contrarian',
    directive:
      'Challenge the dominant belief with grounded evidence — provocative but not clickbait.',
    archetypePrefs: ['contrarian', 'myth_busting', 'dark_psychology'],
  },
  investigation: {
    id: 'investigation',
    label: 'Investigation',
    directive:
      'Reporter energy — follow clues, surface what was overlooked, build toward a reveal.',
    archetypePrefs: ['documentary', 'case_study', 'myth_busting'],
  },
  myth_busting: {
    id: 'myth_busting',
    label: 'Myth Busting',
    directive:
      'Name a widely held belief, dismantle it layer by layer, land a sharper truth.',
    archetypePrefs: ['myth_busting', 'contrarian', 'educational'],
  },
  dark_psychology: {
    id: 'dark_psychology',
    label: 'Dark Psychology',
    directive:
      'Expose hidden mechanisms — manipulation, bias, or power dynamics. Clinical, not sensational.',
    archetypePrefs: ['dark_psychology', 'contrarian', 'story'],
  },
  emotional: {
    id: 'emotional',
    label: 'Emotional',
    directive:
      'Lead with felt experience — inner conflict, recognition, catharsis. Specific beats over vague inspiration.',
    archetypePrefs: ['story', 'documentary', 'case_study'],
  },
  authority: {
    id: 'authority',
    label: 'Authority',
    directive:
      'Expert lens — credible insight, mechanism, proof. Teach without lecturing.',
    archetypePrefs: ['educational', 'case_study', 'documentary'],
  },
  case_study: {
    id: 'case_study',
    label: 'Case Study',
    directive:
      'One subject, real specifics — situation, decision, outcome, extracted lesson.',
    archetypePrefs: ['case_study', 'story', 'documentary'],
  },
  challenge: {
    id: 'challenge',
    label: 'Challenge',
    directive:
      'Issue a direct dare or stakes-based test — what changes if the viewer acts (or ignores) this.',
    archetypePrefs: ['list_format', 'contrarian', 'story'],
  },
  prediction: {
    id: 'prediction',
    label: 'Prediction',
    directive:
      'Forecast a shift, trend, or consequence — make the future feel inevitable or urgent.',
    archetypePrefs: ['contrarian', 'educational', 'documentary'],
  },
  historical_parallel: {
    id: 'historical_parallel',
    label: 'Historical Parallel',
    directive:
      'Connect past event or era to present behavior — pattern recognition across time.',
    archetypePrefs: ['documentary', 'story', 'myth_busting'],
  },
  personal_revelation: {
    id: 'personal_revelation',
    label: 'Personal Revelation',
    directive:
      'Confessional entry — what you learned, failed at, or finally admitted. First-person specificity.',
    archetypePrefs: ['story', 'case_study', 'documentary'],
  },
  warning: {
    id: 'warning',
    label: 'Warning',
    directive:
      'Signal risk, cost, or trap — what goes wrong when people ignore this pattern.',
    archetypePrefs: ['dark_psychology', 'contrarian', 'myth_busting'],
  },
  unexpected_truth: {
    id: 'unexpected_truth',
    label: 'Unexpected Truth',
    directive:
      'Subvert assumptions — the real cause/effect is the opposite of what the audience expects.',
    archetypePrefs: ['myth_busting', 'contrarian', 'story'],
  },
}

export const HOOK_FRAMEWORK_IDS = [
  'curiosity',
  'open_loop',
  'story',
  'contrarian',
  'statistic',
  'challenge',
  'question',
  'prediction',
  'documentary_opening',
  'personal_confession',
] as const

export type HookFrameworkId = (typeof HOOK_FRAMEWORK_IDS)[number]

export type HookFramework = {
  id: HookFrameworkId
  label: string
  instruction: string
  example: string
}

export const HOOK_FRAMEWORKS: Record<HookFrameworkId, HookFramework> = {
  curiosity: {
    id: 'curiosity',
    label: 'Curiosity',
    instruction: 'Withhold the key reveal — create an itch without resolving it in the hook.',
    example:
      'There is one detail in this story that changes everything — and most people scroll past it.',
  },
  open_loop: {
    id: 'open_loop',
    label: 'Open Loop',
    instruction: 'Start mid-action or mid-thought — the viewer must stay to close the loop.',
    example: 'She almost deleted the message — and that almost changed everything.',
  },
  story: {
    id: 'story',
    label: 'Story',
    instruction: 'Drop into a scene with a character, clock, or decision that implies unfolding drama.',
    example: 'Three seconds before the meeting, he realized the number on the slide was wrong.',
  },
  contrarian: {
    id: 'contrarian',
    label: 'Contrarian',
    instruction: 'Name a common belief, then invert it with a sharper cinematic truth.',
    example:
      'Everyone says discipline is the answer — but the real story starts when willpower stops working.',
  },
  statistic: {
    id: 'statistic',
    label: 'Statistic',
    instruction: 'Lead with a specific, surprising number or ratio — then humanize it immediately.',
    example: 'Nine out of ten creators quit before this one invisible threshold — here is what it is.',
  },
  challenge: {
    id: 'challenge',
    label: 'Challenge',
    instruction: 'Issue a direct dare or name a stuck behavior the viewer recognizes.',
    example: 'Try this for seven days — if nothing shifts, you can ignore everything else I say.',
  },
  question: {
    id: 'question',
    label: 'Question',
    instruction: 'Ask one precise question the viewer cannot answer yet — not a rhetorical platitude.',
    example: 'What if the habit keeping you safe is the same one keeping you stuck?',
  },
  prediction: {
    id: 'prediction',
    label: 'Prediction',
    instruction: 'Forecast a consequence or shift — make the future feel urgent or inevitable.',
    example: 'Within two years, this mistake will cost more creators their audience than any algorithm change.',
  },
  documentary_opening: {
    id: 'documentary_opening',
    label: 'Documentary Opening',
    instruction: 'Open like vérité: specific time, place, or witness detail that pulls the viewer in.',
    example:
      'In 2019, a photographer noticed something in the background of a single frame — and could not unsee it.',
  },
  personal_confession: {
    id: 'personal_confession',
    label: 'Personal Confession',
    instruction: 'First-person admission — vulnerability with specificity, not generic motivation.',
    example: 'I lied about being fine for two years — until one Tuesday morning I could not pretend anymore.',
  },
}

/** Title patterns to ban in prompts and optional post-validation. */
export const BANNED_TITLE_PATTERNS: readonly RegExp[] = [
  /\bthe mistake everyone makes\b/i,
  /\bfix your\b/i,
  /\bwatch this before\b/i,
  /\bhere'?s why\b/i,
  /\bthe hidden truth\b/i,
  /\bmost people\b/i,
  /\bstop doing this\b/i,
]

/** Hook opening phrases to ban. */
export const BANNED_HOOK_OPENINGS: readonly RegExp[] = [
  /^if you'?re struggling\b/i,
  /^most people\b/i,
  /^here'?s why\b/i,
  /^watch this before\b/i,
]

const NICHE_ANGLE_PREFERENCES: Partial<Record<CinematicNiche, ContentAngleId[]>> = {
  psychology: ['dark_psychology', 'emotional', 'contrarian', 'personal_revelation'],
  documentary: ['documentary', 'investigation', 'historical_parallel', 'story'],
  finance: ['case_study', 'authority', 'prediction', 'contrarian'],
  motivation: ['story', 'challenge', 'personal_revelation', 'emotional'],
  luxury: ['documentary', 'case_study', 'authority', 'story'],
  fitness: ['challenge', 'case_study', 'myth_busting', 'story'],
  spirituality: ['emotional', 'story', 'personal_revelation', 'unexpected_truth'],
  storytelling: ['story', 'documentary', 'personal_revelation', 'unexpected_truth'],
  'faceless reels': ['myth_busting', 'contrarian', 'unexpected_truth', 'challenge'],
}

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

export function normalizeContentAngleId(raw: unknown): ContentAngleId | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return CONTENT_ANGLE_IDS.includes(key as ContentAngleId) ? (key as ContentAngleId) : null
}

export function getContentAngle(id: ContentAngleId): ContentAngle {
  return CONTENT_ANGLES[id]
}

export function getHookFramework(id: HookFrameworkId): HookFramework {
  return HOOK_FRAMEWORKS[id]
}

export function normalizeHookFrameworkId(raw: unknown): HookFrameworkId | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return HOOK_FRAMEWORK_IDS.includes(key as HookFrameworkId) ? (key as HookFrameworkId) : null
}

export function loadRecentContentAngles(): ContentAngleId[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(RECENT_CONTENT_ANGLES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeContentAngleId(item))
      .filter((item): item is ContentAngleId => item !== null)
      .slice(-RECENT_CONTENT_ANGLES_MAX)
  } catch {
    return []
  }
}

export function recordContentAngleInSession(angleId: ContentAngleId): void {
  if (typeof window === 'undefined') return
  try {
    const recent = loadRecentContentAngles().filter((id) => id !== angleId)
    recent.push(angleId)
    sessionStorage.setItem(
      RECENT_CONTENT_ANGLES_KEY,
      JSON.stringify(recent.slice(-RECENT_CONTENT_ANGLES_MAX))
    )
  } catch {
    /* quota / private mode */
  }
}

export function coerceRecentContentAngles(raw: unknown, max = RECENT_CONTENT_ANGLES_MAX): ContentAngleId[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => normalizeContentAngleId(item))
    .filter((item): item is ContentAngleId => item !== null)
    .slice(-max)
}

export type SelectContentAngleInput = {
  niche?: CinematicNiche | string
  topic?: string
  sessionSeed?: string | number
  recentAngles?: ContentAngleId[]
  /** When set, skip selection and use this angle (still recorded client-side). */
  contentAngleId?: ContentAngleId | string
}

export type SelectedContentAngle = ContentAngle

function buildAnglePool(input: SelectContentAngleInput): ContentAngleId[] {
  const nicheKey = (input.niche ?? 'storytelling') as CinematicNiche
  const nichePrefs = NICHE_ANGLE_PREFERENCES[nicheKey] ?? NICHE_ANGLE_PREFERENCES.storytelling ?? []
  const recent = input.recentAngles ?? []
  const last = recent[recent.length - 1]

  const unexplored = CONTENT_ANGLE_IDS.filter((id) => !recent.includes(id))
  const nonConsecutive = CONTENT_ANGLE_IDS.filter((id) => id !== last)

  let pool = unexplored.length >= 3 ? unexplored : nonConsecutive
  if (nichePrefs.length) {
    const nicheFirst = nichePrefs.filter((id) => pool.includes(id))
    const rest = pool.filter((id) => !nicheFirst.includes(id))
    pool = [...nicheFirst, ...rest]
  }
  return pool.length ? pool : [...CONTENT_ANGLE_IDS]
}

export function selectContentAngle(input: SelectContentAngleInput): SelectedContentAngle {
  const forced = normalizeContentAngleId(input.contentAngleId)
  if (forced) return CONTENT_ANGLES[forced]

  const pool = buildAnglePool(input)
  const seed = Math.abs(
    hashString(String(input.sessionSeed ?? '')) ^
      hashString(input.topic ?? '') ^
      hashString(String(input.niche ?? ''))
  )
  const id = pool[seed % pool.length]
  return CONTENT_ANGLES[id]
}

export function selectHookFramework(input: {
  sessionSeed?: string | number
  attemptIndex?: number
  recentFrameworks?: HookFrameworkId[]
}): HookFramework {
  const attempt = Math.max(0, input.attemptIndex ?? 0)
  const recent = input.recentFrameworks ?? []
  const lastFramework = recent[recent.length - 1]
  const pool = HOOK_FRAMEWORK_IDS.filter((id) => id !== lastFramework)
  const seed = Math.abs(
    hashString(String(input.sessionSeed ?? '')) ^ (attempt + 1) * 7919
  )
  const id = (pool.length ? pool : HOOK_FRAMEWORK_IDS)[seed % (pool.length || HOOK_FRAMEWORK_IDS.length)]
  return HOOK_FRAMEWORKS[id]
}

export function rotatedHookFrameworkByIndex(attemptIndex: number): HookFramework {
  return selectHookFramework({ attemptIndex })
}

/** Archetype preference boost from selected content angle — merges into script-archetypes pool. */
export function contentAngleArchetypePrefs(angle: SelectedContentAngle): ScriptArchetypeId[] {
  return angle.archetypePrefs
}

export function isBannedTitle(title: string): boolean {
  const trimmed = title.trim()
  if (!trimmed) return false
  return BANNED_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export function isBannedHookOpening(hook: string): boolean {
  const trimmed = hook.trim()
  if (!trimmed) return false
  return BANNED_HOOK_OPENINGS.some((pattern) => pattern.test(trimmed))
}

export function sanitizeTitleCandidate(title: string, seed: number): string {
  if (!isBannedTitle(title)) return title
  const suffixes = [' — A Different Take', ' — What Nobody Says', ' — The Real Pattern']
  return `${title.replace(/\s*—.*$/, '').trim()}${suffixes[Math.abs(seed) % suffixes.length]}`
}

export function buildContentAnglePromptSection(angle: SelectedContentAngle): string {
  return [
    `CONTENT ANGLE: ${angle.label}`,
    angle.directive,
    `Title, hook, and script beats must feel like a ${angle.label.toLowerCase()} piece — not a generic template.`,
    `Include in JSON when applicable: "contentAngleId": "${angle.id}", "contentAngleLabel": "${angle.label}".`,
  ].join('\n')
}

export function buildHookFrameworkPromptSection(framework: HookFramework): string {
  return [
    `HOOK FRAMEWORK: ${framework.label}`,
    framework.instruction,
    `Example shape (do NOT copy verbatim): "${framework.example}"`,
    `Include in JSON when applicable: "hookFramework": "${framework.id}".`,
    `Banned hook openings: "If you're struggling", "Most people", "Here's why", "Watch this before".`,
  ].join('\n')
}

export function buildTitleOriginalityRules(): string {
  return [
    'TITLE ORIGINALITY — never use these overused patterns:',
    '- "The Mistake Everyone Makes", "Fix Your", "Watch This Before", "Here\'s Why"',
    '- "The Hidden Truth", "Most People", "Stop Doing This"',
    'Write like a creative strategist — specific, fresh, angle-native.',
  ].join('\n')
}

export type ContentAngleMeta = {
  contentAngleId: ContentAngleId
  contentAngleLabel: string
  hookFramework?: HookFrameworkId
  hookFrameworkLabel?: string
}

export function contentAngleMetaFromSelection(
  angle: SelectedContentAngle,
  framework?: HookFramework
): ContentAngleMeta {
  return {
    contentAngleId: angle.id,
    contentAngleLabel: angle.label,
    ...(framework
      ? {
          hookFramework: framework.id,
          hookFrameworkLabel: framework.label,
        }
      : {}),
  }
}

export function hookFrameworkDisplayLabel(meta?: ContentAngleMeta | null): string | null {
  if (!meta?.hookFrameworkLabel?.trim()) {
    if (meta?.hookFramework) {
      const fw = HOOK_FRAMEWORKS[meta.hookFramework as HookFrameworkId]
      return fw?.label ?? null
    }
    return null
  }
  return meta.hookFrameworkLabel.trim()
}

export function contentAngleDisplayLabel(meta?: ContentAngleMeta | null): string | null {
  if (!meta?.contentAngleLabel?.trim()) return null
  return meta.contentAngleLabel.trim()
}
