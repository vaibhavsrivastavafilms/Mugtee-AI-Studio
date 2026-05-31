import type { CinematicNiche } from '@/lib/cinematic/niches'
import {
  getContentAngle,
  normalizeContentAngleId,
  type ContentAngleId,
} from '@/lib/cinematic/content-angle-engine'

export const NARRATIVE_ARCHETYPE_IDS = [
  'personal_transformation',
  'documentary',
  'investigation',
  'contrarian_argument',
  'myth_busting',
  'case_study',
  'historical_narrative',
  'psychological_breakdown',
  'character_journey',
  'warning',
  'prediction',
  'challenge',
  'experiment',
  'timeline_story',
  'origin_story',
] as const

export type NarrativeArchetypeId = (typeof NARRATIVE_ARCHETYPE_IDS)[number]

export type NarrativeArchetype = {
  id: NarrativeArchetypeId
  label: string
  /** Named scene labels — beats and scene titles must use these (not Beat 1/Problem/Solution). */
  sceneLabels: readonly string[]
  beatInstructions: string
  emotionExamples: string[]
}

export const NARRATIVE_ARCHETYPES: Record<NarrativeArchetypeId, NarrativeArchetype> = {
  personal_transformation: {
    id: 'personal_transformation',
    label: 'Personal Transformation Story',
    sceneLabels: ['Before', 'Breaking Point', 'Discovery', 'Action', 'Result'],
    beatInstructions:
      'Personal change arc: Before state → Breaking Point → Discovery → Action taken → Result. Each label gets 1–3 beats; stay in first-person or witnessed specificity.',
    emotionExamples: ['stasis', 'rupture', 'recognition', 'resolve', 'proof', 'afterglow'],
  },
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    sceneLabels: ['Cold Open', 'Context', 'Conflict', 'Resolution', 'Legacy'],
    beatInstructions:
      'Vérité documentary: Cold Open detail → Context layer → Conflict at center → Resolution → Legacy/aftertaste. Witness — do not preach.',
    emotionExamples: ['stillness', 'curiosity', 'gravity', 'tension', 'recognition', 'awe'],
  },
  investigation: {
    id: 'investigation',
    label: 'Investigation',
    sceneLabels: ['Claim', 'Evidence', 'Contradiction', 'Discovery', 'Conclusion'],
    beatInstructions:
      'Reporter arc: Claim on the table → Evidence gathered → Contradiction surfaced → Discovery/reveal → Conclusion with stakes.',
    emotionExamples: ['skepticism', 'intrigue', 'doubt', 'surprise', 'clarity', 'weight'],
  },
  contrarian_argument: {
    id: 'contrarian_argument',
    label: 'Contrarian Argument',
    sceneLabels: ['Common Belief', 'Challenge', 'Evidence', 'Alternative Frame', 'New Lens'],
    beatInstructions:
      'Opinion flip: Common Belief → bold Challenge → Evidence → Alternative Frame → New Lens for the viewer. Provocative but grounded.',
    emotionExamples: ['assumption', 'defiance', 'proof', 'tension', 'reframe', 'conviction'],
  },
  myth_busting: {
    id: 'myth_busting',
    label: 'Myth Busting',
    sceneLabels: ['Popular Claim', 'Why They Believe', 'Contradiction', 'Proof', 'Correct Takeaway'],
    beatInstructions:
      'Belief teardown: Popular Claim → Why They Believe → Contradiction → Proof → Correct Takeaway. Dismantle one layer per label group.',
    emotionExamples: ['assumption', 'doubt', 'surprise', 'clarity', 'skepticism', 'conviction'],
  },
  case_study: {
    id: 'case_study',
    label: 'Case Study',
    sceneLabels: ['Subject Intro', 'Situation', 'Critical Decision', 'Outcome', 'Lesson'],
    beatInstructions:
      'One subject, real specifics: Subject Intro → Situation → Critical Decision → Outcome → Lesson extracted for the viewer.',
    emotionExamples: ['intrigue', 'stakes', 'decision', 'outcome', 'lesson', 'application'],
  },
  historical_narrative: {
    id: 'historical_narrative',
    label: 'Historical Narrative',
    sceneLabels: ['Setting', 'Trigger', 'Conflict', 'Turning Point', 'Aftermath'],
    beatInstructions:
      'Past-tense cinematic history: Setting (time/place) → Trigger event → Conflict → Turning Point → Aftermath echoing today.',
    emotionExamples: ['distance', 'intrigue', 'escalation', 'shock', 'pivot', 'resonance'],
  },
  psychological_breakdown: {
    id: 'psychological_breakdown',
    label: 'Psychological Breakdown',
    sceneLabels: ['Behavior', 'Hidden Cause', 'Example', 'Explanation', 'Takeaway'],
    beatInstructions:
      'Mechanism reveal: Observable Behavior → Hidden Cause → concrete Example → clinical Explanation → actionable Takeaway.',
    emotionExamples: ['recognition', 'unease', 'intrigue', 'clarity', 'caution', 'resolve'],
  },
  character_journey: {
    id: 'character_journey',
    label: 'Character Journey',
    sceneLabels: ['Setup', 'Inciting Event', 'Ordeal', 'Transformation', 'Return'],
    beatInstructions:
      'Hero-style arc on one character: Setup → Inciting Event → Ordeal → Transformation → Return (new normal). Filmable scenes.',
    emotionExamples: ['ordinary', 'disruption', 'struggle', 'shift', 'triumph', 'echo'],
  },
  warning: {
    id: 'warning',
    label: 'Warning',
    sceneLabels: ['Pattern', 'Risk Signal', 'Real Cost', 'Near Miss', 'Prevent'],
    beatInstructions:
      'Risk signal: Pattern recognition → Risk Signal → Real Cost (specific) → Near Miss story → how to Prevent.',
    emotionExamples: ['recognition', 'unease', 'urgency', 'shock', 'caution', 'agency'],
  },
  prediction: {
    id: 'prediction',
    label: 'Prediction',
    sceneLabels: ['Current State', 'Emerging Signal', 'Trajectory', 'Consequence', 'Horizon'],
    beatInstructions:
      'Forecast arc: Current State → Emerging Signal → Trajectory → Consequence → Horizon (what to watch). Make the future feel inevitable or urgent.',
    emotionExamples: ['baseline', 'curiosity', 'momentum', 'stakes', 'inevitability', 'focus'],
  },
  challenge: {
    id: 'challenge',
    label: 'Challenge',
    sceneLabels: ['Dare', 'Stakes', 'Day One', 'Proof Point', 'Call to Act'],
    beatInstructions:
      'Direct dare: Dare issued → Stakes named → Day One reality → Proof Point → Call to Act. Test the viewer — not generic motivation.',
    emotionExamples: ['provocation', 'stakes', 'commitment', 'progress', 'proof', 'momentum'],
  },
  experiment: {
    id: 'experiment',
    label: 'Experiment',
    sceneLabels: ['Hypothesis', 'Setup', 'Test', 'Result', 'What It Means'],
    beatInstructions:
      'Trial narrative: Hypothesis → Setup → Test (what happened) → Result → What It Means for the viewer.',
    emotionExamples: ['curiosity', 'anticipation', 'tension', 'surprise', 'data', 'insight'],
  },
  timeline_story: {
    id: 'timeline_story',
    label: 'Timeline Story',
    sceneLabels: ['Opening Moment', 'First Shift', 'Escalation', 'Pivot', 'Present Day'],
    beatInstructions:
      'Chronological reel: Opening Moment → First Shift → Escalation → Pivot → Present Day landing. Time markers beat generic advice.',
    emotionExamples: ['anchor', 'shift', 'momentum', 'crisis', 'pivot', 'present'],
  },
  origin_story: {
    id: 'origin_story',
    label: 'Origin Story',
    sceneLabels: ['Before Existed', 'Spark', 'First Attempt', 'Breakthrough', 'Identity'],
    beatInstructions:
      'Genesis arc: Before Existed → Spark → First Attempt → Breakthrough → Identity (who/what it became). Specific, not mythic filler.',
    emotionExamples: ['void', 'spark', 'struggle', 'breakthrough', 'identity', 'legacy'],
  },
}

/** Map legacy script-archetype ids → narrative archetypes. */
export const LEGACY_SCRIPT_ARCHETYPE_MAP: Record<string, NarrativeArchetypeId> = {
  story: 'personal_transformation',
  documentary: 'documentary',
  myth_busting: 'myth_busting',
  contrarian: 'contrarian_argument',
  dark_psychology: 'psychological_breakdown',
  educational: 'case_study',
  list_format: 'challenge',
  case_study: 'case_study',
}

/** Banned generic script phrases — injected into prompts. */
export const BANNED_SCRIPT_PHRASES: readonly string[] = [
  'consistency is key',
  'most people fail because',
  'watch this before',
  "here's why",
  'the answer is',
  'try this for 30 days',
]

export const BANNED_BEAT_LABELS: readonly string[] = [
  'Beat 1',
  'Beat 2',
  'Beat 3',
  'Problem',
  'Struggle',
  'Solution',
  'Outcome',
  'CTA',
]

const NICHE_NARRATIVE_PREFERENCES: Record<CinematicNiche, NarrativeArchetypeId[]> = {
  psychology: ['psychological_breakdown', 'character_journey', 'warning', 'personal_transformation'],
  documentary: ['documentary', 'investigation', 'historical_narrative', 'timeline_story'],
  finance: ['case_study', 'prediction', 'contrarian_argument', 'timeline_story'],
  motivation: ['personal_transformation', 'challenge', 'character_journey', 'origin_story'],
  luxury: ['documentary', 'case_study', 'origin_story', 'timeline_story'],
  fitness: ['challenge', 'experiment', 'case_study', 'personal_transformation'],
  spirituality: ['character_journey', 'origin_story', 'personal_transformation', 'documentary'],
  storytelling: ['character_journey', 'personal_transformation', 'documentary', 'timeline_story'],
  'faceless reels': ['myth_busting', 'contrarian_argument', 'investigation', 'challenge'],
}

const TOPIC_KEYWORD_NARRATIVES: Array<{ pattern: RegExp; prefs: NarrativeArchetypeId[] }> = [
  {
    pattern: /\b(psycholog|mind|manipul|narciss|attachment|cognitive|behavior)\b/i,
    prefs: ['psychological_breakdown', 'warning', 'character_journey'],
  },
  {
    pattern: /\b(histor|ancient|war|empire|archive|biograph|century|era)\b/i,
    prefs: ['historical_narrative', 'documentary', 'timeline_story'],
  },
  {
    pattern: /\b(money|invest|stock|crypto|finance|budget|compound|wealth)\b/i,
    prefs: ['case_study', 'prediction', 'contrarian_argument'],
  },
  {
    pattern: /\b(myth|debunk|fact.?check|wrong|lie|misconception)\b/i,
    prefs: ['myth_busting', 'investigation', 'contrarian_argument'],
  },
  {
    pattern: /\b(how to|tips|ways|steps|guide|challenge|try this)\b/i,
    prefs: ['challenge', 'experiment', 'case_study'],
  },
  {
    pattern: /\b(story|journey|happened|when i|one day|transformation)\b/i,
    prefs: ['personal_transformation', 'character_journey', 'origin_story'],
  },
  {
    pattern: /\b(predict|future|trend|will happen|next year|coming)\b/i,
    prefs: ['prediction', 'warning', 'timeline_story'],
  },
  {
    pattern: /\b(experiment|tested|tried for|hypothesis|results)\b/i,
    prefs: ['experiment', 'case_study', 'personal_transformation'],
  },
]

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

export function normalizeNarrativeArchetypeId(raw: unknown): NarrativeArchetypeId | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (NARRATIVE_ARCHETYPE_IDS.includes(key as NarrativeArchetypeId)) {
    return key as NarrativeArchetypeId
  }
  return LEGACY_SCRIPT_ARCHETYPE_MAP[key] ?? null
}

export function getNarrativeArchetype(id: NarrativeArchetypeId): NarrativeArchetype {
  return NARRATIVE_ARCHETYPES[id]
}

export function buildNarrativeFlowDisplay(labels: readonly string[]): string {
  return labels.join(' → ')
}

function topicKeywordPreferences(topic: string): NarrativeArchetypeId[] {
  for (const row of TOPIC_KEYWORD_NARRATIVES) {
    if (row.pattern.test(topic)) return row.prefs
  }
  return []
}

function mergePreferencePools(...pools: NarrativeArchetypeId[][]): NarrativeArchetypeId[] {
  const seen = new Set<NarrativeArchetypeId>()
  const merged: NarrativeArchetypeId[] = []
  for (const pool of pools) {
    for (const id of pool) {
      if (!seen.has(id)) {
        seen.add(id)
        merged.push(id)
      }
    }
  }
  return merged.length ? merged : ['personal_transformation', 'documentary', 'character_journey']
}

export type SelectNarrativeArchetypeInput = {
  niche?: CinematicNiche | string
  topic?: string
  contentType?: string
  sessionSeed?: string | number
  creatorNiche?: string
  contentAngleId?: ContentAngleId | string
}

export type SelectedNarrativeArchetype = NarrativeArchetype

export function selectNarrativeArchetype(
  input: SelectNarrativeArchetypeInput
): SelectedNarrativeArchetype {
  const topic = (input.topic ?? '').trim()
  const nicheKey = (input.niche ?? 'storytelling') as CinematicNiche
  const nichePrefs =
    NICHE_NARRATIVE_PREFERENCES[nicheKey] ?? NICHE_NARRATIVE_PREFERENCES.storytelling
  const topicPrefs = topic ? topicKeywordPreferences(topic) : []
  const creatorNiche = (input.creatorNiche ?? '').trim().toLowerCase()
  const creatorPrefs = creatorNiche ? topicKeywordPreferences(creatorNiche) : []
  const angleId = normalizeContentAngleId(input.contentAngleId)
  const anglePrefs = angleId
    ? getContentAngle(angleId).narrativeArchetypePrefs
    : []

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
  return NARRATIVE_ARCHETYPES[id]
}

/** Distribute beat count across scene labels (round-robin). */
export function assignBeatLabels(
  beatCount: number,
  sceneLabels: readonly string[]
): string[] {
  if (!sceneLabels.length || beatCount <= 0) return []
  return Array.from({ length: beatCount }, (_, i) => sceneLabels[i % sceneLabels.length])
}

export function buildBannedScriptPhrasesSection(): string {
  return [
    'BANNED PHRASES (never use in hook, beats, payoff, or CTA):',
    ...BANNED_SCRIPT_PHRASES.map((p) => `- "${p}"`),
    `BANNED BEAT/SCENE LABELS (unless archetype-specific above): ${BANNED_BEAT_LABELS.join(', ')}`,
    'Do NOT use problem→struggle→solution→outcome→CTA as beat labels.',
  ].join('\n')
}

export function buildNarrativeStructurePromptSection(
  archetype: SelectedNarrativeArchetype
): string {
  const flow = buildNarrativeFlowDisplay(archetype.sceneLabels)
  const emotions = archetype.emotionExamples.slice(0, 5).join(', ')
  const labelDirective = archetype.sceneLabels
    .map((label, i) => `  ${i + 1}. "${label}" — 1–3 beats each`)
    .join('\n')

  return [
    `NARRATIVE ARCHETYPE: ${archetype.label}`,
    `NARRATIVE FLOW: ${flow}`,
    archetype.beatInstructions,
    `MANDATORY SCENE LABELS (use verbatim for scriptBeats[].label AND scenes[].title):`,
    labelDirective,
    `Spread 8–12 beats across these labels — multiple beats may share a label.`,
    `Emotion labels: archetype-native (e.g. ${emotions}) — NOT a fixed curiosity→tension→shock→hope template.`,
    buildBannedScriptPhrasesSection(),
    `Include in JSON: "narrativeArchetype": "${archetype.id}", "narrativeArchetypeLabel": "${archetype.label}", "narrativeStructureLabels": ${JSON.stringify([...archetype.sceneLabels])}, "narrativeFlowDisplay": "${flow}".`,
  ].join('\n')
}

export type NarrativeStructureMeta = {
  narrativeArchetype: NarrativeArchetypeId
  narrativeArchetypeLabel: string
  narrativeStructureLabels: string[]
  narrativeFlowDisplay: string
}

export function narrativeMetaFromSelection(
  archetype: SelectedNarrativeArchetype
): NarrativeStructureMeta {
  return {
    narrativeArchetype: archetype.id,
    narrativeArchetypeLabel: archetype.label,
    narrativeStructureLabels: [...archetype.sceneLabels],
    narrativeFlowDisplay: buildNarrativeFlowDisplay(archetype.sceneLabels),
  }
}

export function resolveNarrativeFromOutput(
  raw: Record<string, unknown>,
  fallback: SelectedNarrativeArchetype
): SelectedNarrativeArchetype {
  const id =
    normalizeNarrativeArchetypeId(
      raw.narrativeArchetype ?? raw.narrative_archetype ?? raw.archetypeId ?? raw.archetype_id
    ) ?? fallback.id
  const base = NARRATIVE_ARCHETYPES[id]
  const label =
    typeof raw.narrativeArchetypeLabel === 'string' && raw.narrativeArchetypeLabel.trim()
      ? raw.narrativeArchetypeLabel.trim()
      : typeof raw.archetypeLabel === 'string' && raw.archetypeLabel.trim()
        ? raw.archetypeLabel.trim()
        : base.label
  return { ...base, label }
}

export function parseNarrativeMetaFromOutput(
  raw: Record<string, unknown>,
  fallback: SelectedNarrativeArchetype
): NarrativeStructureMeta {
  const resolved = resolveNarrativeFromOutput(raw, fallback)
  const labelsRaw = raw.narrativeStructureLabels ?? raw.narrative_structure_labels
  const labels = Array.isArray(labelsRaw)
    ? labelsRaw.filter((l): l is string => typeof l === 'string' && l.trim().length > 0).map((l) => l.trim())
    : [...resolved.sceneLabels]
  const flowDisplay =
    typeof raw.narrativeFlowDisplay === 'string' && raw.narrativeFlowDisplay.trim()
      ? raw.narrativeFlowDisplay.trim()
      : buildNarrativeFlowDisplay(labels.length ? labels : resolved.sceneLabels)

  return {
    narrativeArchetype: resolved.id,
    narrativeArchetypeLabel: resolved.label,
    narrativeStructureLabels: labels.length ? labels : [...resolved.sceneLabels],
    narrativeFlowDisplay: flowDisplay,
  }
}
