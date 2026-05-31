import type { CinematicNiche } from '@/lib/cinematic/niches'
import {
  contentAngleArchetypePrefs,
  getContentAngle,
  normalizeContentAngleId,
  type ContentAngleId,
} from '@/lib/cinematic/content-angle-engine'

export const SCRIPT_ARCHETYPE_IDS = [
  'story',
  'documentary',
  'myth_busting',
  'contrarian',
  'dark_psychology',
  'educational',
  'list_format',
  'case_study',
] as const

export type ScriptArchetypeId = (typeof SCRIPT_ARCHETYPE_IDS)[number]

export type ScriptArchetype = {
  id: ScriptArchetypeId
  label: string
  /** Compact beat-structure directive injected into prompts */
  beatInstructions: string
  /** Example emotion labels for this archetype (not mandatory verbatim) */
  emotionExamples: string[]
}

export const SCRIPT_ARCHETYPES: Record<ScriptArchetypeId, ScriptArchetype> = {
  story: {
    id: 'story',
    label: 'Story',
    beatInstructions:
      'Personal narrative arc: Setup → Inciting moment → Rising conflict → Turning point → Resolution → Lesson. Beats feel like scenes in a mini-film, not a listicle.',
    emotionExamples: ['intrigue', 'empathy', 'tension', 'surprise', 'relief', 'resolve'],
  },
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    beatInstructions:
      'Observational arc: Scene-setting → Witness detail → Evidence → Historical/context layer → Revelation → Quiet reflection. Voice is vérité — witness, don’t preach.',
    emotionExamples: ['stillness', 'curiosity', 'gravity', 'recognition', 'awe', 'aftertaste'],
  },
  myth_busting: {
    id: 'myth_busting',
    label: 'Myth Busting',
    beatInstructions:
      'Belief teardown: Common claim → Why people believe it → Contradiction → Proof/example → Reframe → Correct takeaway. Each beat dismantles one layer.',
    emotionExamples: ['assumption', 'doubt', 'surprise', 'clarity', 'skepticism', 'conviction'],
  },
  contrarian: {
    id: 'contrarian',
    label: 'Contrarian',
    beatInstructions:
      'Opinion flip: Popular belief → Bold challenge → Evidence → Alternative frame → Stakes → New lens. Be provocative but grounded — not clickbait.',
    emotionExamples: ['defiance', 'provocation', 'tension', 'proof', 'urgency', 'reframe'],
  },
  dark_psychology: {
    id: 'dark_psychology',
    label: 'Dark Psychology',
    beatInstructions:
      'Mechanism reveal: Pattern recognition → Hidden tactic → Real example → Manipulation exposed → Defense/warning → Unsettling close. Clinical, not sensational.',
    emotionExamples: ['recognition', 'unease', 'intrigue', 'shock', 'caution', 'aftershock'],
  },
  educational: {
    id: 'educational',
    label: 'Educational',
    beatInstructions:
      'Teach arc: Problem/question → Core concept → Mechanism/how → Concrete example → Application → Recap. One idea per beat — no lecture paragraphs.',
    emotionExamples: ['curiosity', 'clarity', 'understanding', 'example', 'application', 'confidence'],
  },
  list_format: {
    id: 'list_format',
    label: 'List Format',
    beatInstructions:
      'Promise-driven: Hook promise → Point 1 → Point 2 → Point 3 (add more if duration allows) → Synthesis → CTA. Each beat is one punchy list item, not a paragraph.',
    emotionExamples: ['promise', 'surprise', 'value', 'insight', 'momentum', 'payoff'],
  },
  case_study: {
    id: 'case_study',
    label: 'Case Study',
    beatInstructions:
      'Subject arc: Introduce subject → Situation/context → Critical decision → Outcome → Lesson extracted → Viewer application. Real specifics beat abstractions.',
    emotionExamples: ['intrigue', 'stakes', 'decision', 'outcome', 'lesson', 'action'],
  },
}

/** Niche → weighted preferred archetypes (first = strongest bias). */
const NICHE_ARCHETYPE_PREFERENCES: Record<CinematicNiche, ScriptArchetypeId[]> = {
  psychology: ['dark_psychology', 'story', 'contrarian'],
  documentary: ['documentary', 'story', 'myth_busting'],
  finance: ['case_study', 'educational', 'contrarian'],
  motivation: ['story', 'contrarian', 'educational'],
  luxury: ['documentary', 'story', 'case_study'],
  fitness: ['case_study', 'list_format', 'story'],
  spirituality: ['story', 'documentary', 'educational'],
  storytelling: ['story', 'documentary', 'case_study'],
  'faceless reels': ['list_format', 'myth_busting', 'contrarian'],
}

const TOPIC_KEYWORD_ARCHETYPES: Array<{ pattern: RegExp; prefs: ScriptArchetypeId[] }> = [
  {
    pattern: /\b(psycholog|mind|manipul|narciss|attachment|cognitive|behavior)\b/i,
    prefs: ['dark_psychology', 'story', 'contrarian'],
  },
  {
    pattern: /\b(histor|ancient|war|empire|archive|documentary|biograph)\b/i,
    prefs: ['documentary', 'story', 'myth_busting'],
  },
  {
    pattern: /\b(money|invest|stock|crypto|finance|budget|compound|wealth)\b/i,
    prefs: ['case_study', 'educational', 'contrarian'],
  },
  {
    pattern: /\b(myth|debunk|fact.?check|wrong|lie|misconception)\b/i,
    prefs: ['myth_busting', 'contrarian', 'educational'],
  },
  {
    pattern: /\b(how to|tips|ways|steps|guide|list|ranked)\b/i,
    prefs: ['list_format', 'educational', 'case_study'],
  },
  {
    pattern: /\b(story|journey|happened|when i|one day)\b/i,
    prefs: ['story', 'documentary', 'case_study'],
  },
]

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

function normalizeArchetypeId(raw: unknown): ScriptArchetypeId | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return SCRIPT_ARCHETYPE_IDS.includes(key as ScriptArchetypeId)
    ? (key as ScriptArchetypeId)
    : null
}

function topicKeywordPreferences(topic: string): ScriptArchetypeId[] {
  for (const row of TOPIC_KEYWORD_ARCHETYPES) {
    if (row.pattern.test(topic)) return row.prefs
  }
  return []
}

function mergePreferencePools(...pools: ScriptArchetypeId[][]): ScriptArchetypeId[] {
  const seen = new Set<ScriptArchetypeId>()
  const merged: ScriptArchetypeId[] = []
  for (const pool of pools) {
    for (const id of pool) {
      if (!seen.has(id)) {
        seen.add(id)
        merged.push(id)
      }
    }
  }
  return merged.length ? merged : ['story', 'educational', 'documentary']
}

export type SelectScriptArchetypeInput = {
  niche?: CinematicNiche | string
  topic?: string
  contentType?: string
  sessionSeed?: string | number
  creatorNiche?: string
  /** Content originality engine — aligns script structure with selected angle */
  contentAngleId?: ContentAngleId | string
}

export type SelectedScriptArchetype = ScriptArchetype & {
  archetypeDisplay?: string
}

export function getScriptArchetype(id: ScriptArchetypeId): ScriptArchetype {
  return SCRIPT_ARCHETYPES[id]
}

export function selectScriptArchetype(
  input: SelectScriptArchetypeInput
): SelectedScriptArchetype {
  const topic = (input.topic ?? '').trim()
  const nicheKey = (input.niche ?? 'storytelling') as CinematicNiche
  const nichePrefs =
    NICHE_ARCHETYPE_PREFERENCES[nicheKey] ??
    NICHE_ARCHETYPE_PREFERENCES.storytelling
  const topicPrefs = topic ? topicKeywordPreferences(topic) : []
  const creatorNiche = (input.creatorNiche ?? '').trim().toLowerCase()
  const creatorPrefs = creatorNiche
    ? topicKeywordPreferences(creatorNiche)
    : []
  const angleId = normalizeContentAngleId(input.contentAngleId)
  const anglePrefs = angleId ? contentAngleArchetypePrefs(getContentAngle(angleId)) : []

  const pool = mergePreferencePools(
    anglePrefs.length ? anglePrefs : [],
    nichePrefs,
    topicPrefs,
    creatorPrefs
  )
  const seed = Math.abs(
    hashString(topic) ^
      hashString(String(input.sessionSeed ?? '')) ^
      hashString(nicheKey) ^
      hashString(input.contentType ?? '')
  )
  const id = pool[seed % pool.length]
  const archetype = SCRIPT_ARCHETYPES[id]

  const secondary =
    pool[(seed + 1) % pool.length] !== id
      ? SCRIPT_ARCHETYPES[pool[(seed + 1) % pool.length]]
      : null
  const archetypeDisplay =
    secondary && seed % 3 === 0 ? `${archetype.label} ${secondary.label}` : undefined

  return { ...archetype, archetypeDisplay }
}

/** Minimal prompt block — avoids bloating system prompt. */
export function buildArchetypePromptSection(archetype: SelectedScriptArchetype): string {
  const emotions = archetype.emotionExamples.slice(0, 5).join(', ')
  return [
    `SCRIPT ARCHETYPE: ${archetype.label}`,
    archetype.beatInstructions,
    `Emotion labels: use archetype-native words (e.g. ${emotions}) — NOT a fixed curiosity→tension→shock→hope template.`,
    `Include in JSON: "archetypeId": "${archetype.id}", "archetypeLabel": "${archetype.label}"${archetype.archetypeDisplay ? `, "archetypeDisplay": "${archetype.archetypeDisplay}"` : ''}.`,
  ].join('\n')
}

export function resolveArchetypeFromOutput(
  raw: Record<string, unknown>,
  fallback: SelectedScriptArchetype
): SelectedScriptArchetype {
  const id = normalizeArchetypeId(raw.archetypeId ?? raw.archetype_id) ?? fallback.id
  const base = SCRIPT_ARCHETYPES[id]
  const label =
    typeof raw.archetypeLabel === 'string' && raw.archetypeLabel.trim()
      ? raw.archetypeLabel.trim()
      : base.label
  const archetypeDisplay =
    typeof raw.archetypeDisplay === 'string' && raw.archetypeDisplay.trim()
      ? raw.archetypeDisplay.trim()
      : fallback.archetypeDisplay
  return { ...base, label, archetypeDisplay }
}

export type ScriptArchetypeMeta = {
  archetypeId: ScriptArchetypeId
  archetypeLabel: string
  archetypeDisplay?: string
}

export function archetypeMetaFromSelection(
  archetype: SelectedScriptArchetype
): ScriptArchetypeMeta {
  return {
    archetypeId: archetype.id,
    archetypeLabel: archetype.label,
    ...(archetype.archetypeDisplay ? { archetypeDisplay: archetype.archetypeDisplay } : {}),
  }
}

export function scriptArchetypeDisplayLabel(
  meta?: ScriptArchetypeMeta | null
): string | null {
  if (!meta?.archetypeLabel?.trim()) return null
  return meta.archetypeDisplay?.trim() || meta.archetypeLabel.trim()
}
