import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type {
  Controversy,
  DeepResearchReport,
  FactValidation,
  FinalRecommendations,
  FuturePrediction,
  HookAngle,
  Metaphor,
  PsychologyInsights,
  RareFact,
  RetentionPlan,
  StoryboardIdea,
  StoryCase,
  TimelineEvent,
  TopicOverview,
  WritersGoldmine,
} from '@/types/deep-research'

/** SOP section titles — 14 sections in generation order. */
export const DEEP_RESEARCH_SOP_SECTIONS = [
  'Topic Overview',
  'Viral Hook Angles',
  'Historical Timeline',
  'Rare Facts',
  'Shocking Stories',
  'Controversies',
  'Psychology',
  'Comparisons & Metaphors',
  'Future Implications',
  'Visual Storyboard Ideas',
  "Script Writer's Goldmine",
  'Retention Engineering',
  'Fact Checking',
  'Final Recommendations',
] as const

const JSON_SCHEMA_EXAMPLE = `{
  "topic": "string",
  "overview": {
    "beginnerExplanation": "string",
    "expertExplanation": "string",
    "oneSentenceSummary": "string",
    "whyItMatters": "string"
  },
  "hookAngles": [
    { "title": "string", "hookLine": "string", "curiosityGap": "string", "audienceTrigger": "string" }
  ],
  "timeline": [
    { "year": "string", "event": "string", "significance": "string" }
  ],
  "rareFacts": [
    { "fact": "string", "sourceHint": "string", "surpriseLevel": "low|medium|high" }
  ],
  "shockingStories": [
    { "title": "string", "summary": "string", "emotionalBeat": "string" }
  ],
  "controversies": [
    { "claim": "string", "opposingView": "string", "stakes": "string" }
  ],
  "psychology": {
    "coreEmotions": ["string"],
    "cognitiveBiases": ["string"],
    "viewerMotivation": "string",
    "fearDesireTriggers": ["string"]
  },
  "metaphors": [
    { "metaphor": "string", "explains": "string" }
  ],
  "futureImplications": [
    { "prediction": "string", "timeframe": "string", "implication": "string" }
  ],
  "storyboardIdeas": [
    {
      "sceneTitle": "string",
      "visualDescription": "string",
      "cameraStyle": "string",
      "lightingMood": "string",
      "atmosphere": "string",
      "emotionalPurpose": "string"
    }
  ],
  "writersGoldmine": {
    "strongestHook": "string",
    "strongestStoryAngle": "string",
    "strongestConflict": "string",
    "strongestReveal": "string",
    "strongestEnding": "string"
  },
  "retentionEngineering": {
    "openingPattern": "string",
    "rehookMoments": ["string"],
    "payoffBeats": ["string"],
    "dropOffRisks": ["string"]
  },
  "factChecking": {
    "highConfidenceFacts": ["string"],
    "needsVerification": ["string"],
    "commonMistakes": ["string"]
  },
  "finalSummary": {
    "top10Discoveries": ["string"],
    "titleIdeas": ["string"],
    "thumbnailIdeas": ["string"],
    "bestDocumentaryAngle": "string",
    "bestFacelessAngle": "string",
    "recommendedStructure": "string"
  }
}`

/** System augment for deep-research LLM calls. */
export function buildDeepResearchSopSystemPrompt(): string {
  return [
    'You are Mugtee Deep Research — a faceless YouTube research analyst.',
    'Produce surprising, retention-ready research — NOT generic encyclopedia summaries or motivational filler.',
    'Use training knowledge only — no live web browsing or fabricated citations.',
    'Output strict JSON matching the schema exactly — no markdown wrapper, no preamble.',
  ].join(' ')
}

/** User prompt — 14-section SOP with embedded JSON schema. */
export function buildDeepResearchSopPrompt(topic: string, language?: ProjectLanguage): string {
  const trimmed = topic.trim()
  const langLock = language ? `\n${languageDirective(language)}\n` : ''

  return `Research this topic deeply for a faceless YouTube documentary script.

Topic: ${trimmed || '<YOUR TOPIC OR TITLE>'}
${langLock}
Use your training knowledge only — no live web search. Be specific, surprising, and script-ready.

Complete ALL 14 SOP sections as JSON fields:

1. Topic Overview — beginnerExplanation, expertExplanation, oneSentenceSummary, whyItMatters
2. Viral Hook Angles — 5+ hookAngles with title, hookLine, curiosityGap, audienceTrigger
3. Historical Timeline — 6+ timeline events with year, event, significance
4. Rare Facts — 8+ rareFacts with fact, sourceHint, surpriseLevel
5. Shocking Stories — 4+ shockingStories with title, summary, emotionalBeat
6. Controversies — 3+ controversies with claim, opposingView, stakes
7. Psychology — coreEmotions, cognitiveBiases, viewerMotivation, fearDesireTriggers
8. Comparisons & Metaphors — 5+ metaphors with metaphor, explains
9. Future Implications — 4+ futureImplications with prediction, timeframe, implication
10. Visual Storyboard Ideas — MINIMUM 25 storyboardIdeas with sceneTitle, visualDescription, cameraStyle, lightingMood, atmosphere, emotionalPurpose
11. Script Writer's Goldmine — strongestHook, strongestStoryAngle, strongestConflict, strongestReveal, strongestEnding
12. Retention Engineering — openingPattern, rehookMoments (5+), payoffBeats (4+), dropOffRisks (3+)
13. Fact Checking — highConfidenceFacts, needsVerification, commonMistakes
14. Final Recommendations — top10Discoveries (10 items), titleIdeas (8+), thumbnailIdeas (6+), bestDocumentaryAngle, bestFacelessAngle, recommendedStructure

Return ONLY valid JSON matching this schema (fill every field; use [] for empty arrays only when truly irrelevant):

${JSON_SCHEMA_EXAMPLE}`
}

function coerceString(value: unknown, fallback = '', max = 4_000): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function coerceStringArray(value: unknown, max = 32, itemMax = 600): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => coerceString(item, '', itemMax))
    .filter(Boolean)
    .slice(0, max)
}

function coerceOverview(raw: unknown, topic: string): TopicOverview {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    beginnerExplanation: coerceString(src.beginnerExplanation, `What ${topic} means for a general audience.`),
    expertExplanation: coerceString(src.expertExplanation, `The non-obvious expert layer of ${topic}.`),
    oneSentenceSummary: coerceString(src.oneSentenceSummary, topic),
    whyItMatters: coerceString(src.whyItMatters, `Why ${topic} matters now.`),
  }
}

function coerceHookAngles(raw: unknown): HookAngle[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        title: coerceString(row.title, `Hook ${i + 1}`),
        hookLine: coerceString(row.hookLine),
        curiosityGap: coerceString(row.curiosityGap),
        audienceTrigger: coerceString(row.audienceTrigger),
      }
    })
    .filter((h) => h.hookLine || h.curiosityGap)
    .slice(0, 12)
}

function coerceTimeline(raw: unknown): TimelineEvent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        year: coerceString(row.year),
        event: coerceString(row.event),
        significance: coerceString(row.significance),
      }
    })
    .filter((e) => e.event)
    .slice(0, 20)
}

function coerceRareFacts(raw: unknown): RareFact[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      const level = coerceString(row.surpriseLevel, 'medium', 16)
      return {
        fact: coerceString(row.fact),
        sourceHint: coerceString(row.sourceHint, 'training knowledge'),
        surpriseLevel: level,
      }
    })
    .filter((f) => f.fact)
    .slice(0, 16)
}

function coerceStories(raw: unknown): StoryCase[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        title: coerceString(row.title),
        summary: coerceString(row.summary),
        emotionalBeat: coerceString(row.emotionalBeat),
      }
    })
    .filter((s) => s.summary || s.title)
    .slice(0, 10)
}

function coerceControversies(raw: unknown): Controversy[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        claim: coerceString(row.claim),
        opposingView: coerceString(row.opposingView),
        stakes: coerceString(row.stakes),
      }
    })
    .filter((c) => c.claim)
    .slice(0, 8)
}

function coercePsychology(raw: unknown): PsychologyInsights {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    coreEmotions: coerceStringArray(src.coreEmotions, 8, 120),
    cognitiveBiases: coerceStringArray(src.cognitiveBiases, 8, 120),
    viewerMotivation: coerceString(src.viewerMotivation, 'Curiosity and emotional payoff.'),
    fearDesireTriggers: coerceStringArray(src.fearDesireTriggers, 8, 120),
  }
}

function coerceMetaphors(raw: unknown): Metaphor[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        metaphor: coerceString(row.metaphor),
        explains: coerceString(row.explains),
      }
    })
    .filter((m) => m.metaphor)
    .slice(0, 12)
}

function coerceFuture(raw: unknown): FuturePrediction[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        prediction: coerceString(row.prediction),
        timeframe: coerceString(row.timeframe),
        implication: coerceString(row.implication),
      }
    })
    .filter((f) => f.prediction)
    .slice(0, 8)
}

function coerceStoryboardIdeas(raw: unknown): StoryboardIdea[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
      return {
        sceneTitle: coerceString(row.sceneTitle, `Scene ${i + 1}`),
        visualDescription: coerceString(row.visualDescription),
        cameraStyle: coerceString(row.cameraStyle),
        lightingMood: coerceString(row.lightingMood),
        atmosphere: coerceString(row.atmosphere),
        emotionalPurpose: coerceString(row.emotionalPurpose),
      }
    })
    .filter((s) => s.visualDescription || s.sceneTitle)
    .slice(0, 40)
}

function coerceGoldmine(raw: unknown, topic: string, hooks: HookAngle[]): WritersGoldmine {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const fallbackHook = hooks[0]?.hookLine || `Everyone talks about ${topic} — but almost nobody mentions this part.`
  return {
    strongestHook: coerceString(src.strongestHook, fallbackHook),
    strongestStoryAngle: coerceString(src.strongestStoryAngle, `The hidden narrative layer of ${topic}.`),
    strongestConflict: coerceString(src.strongestConflict, `The tension between popular belief and reality.`),
    strongestReveal: coerceString(src.strongestReveal, `The pivot moment that reframes everything.`),
    strongestEnding: coerceString(src.strongestEnding, `Close with a question that lingers after the credits.`),
  }
}

function coerceRetention(raw: unknown): RetentionPlan {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    openingPattern: coerceString(src.openingPattern, 'Pattern interrupt → bold claim → immediate stakes.'),
    rehookMoments: coerceStringArray(src.rehookMoments, 8, 220),
    payoffBeats: coerceStringArray(src.payoffBeats, 8, 220),
    dropOffRisks: coerceStringArray(src.dropOffRisks, 6, 220),
  }
}

function coerceFactChecking(raw: unknown): FactValidation {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    highConfidenceFacts: coerceStringArray(src.highConfidenceFacts, 12, 280),
    needsVerification: coerceStringArray(src.needsVerification, 12, 280),
    commonMistakes: coerceStringArray(src.commonMistakes, 8, 280),
  }
}

function coerceFinalSummary(raw: unknown, topic: string): FinalRecommendations {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    top10Discoveries: coerceStringArray(src.top10Discoveries, 10, 280),
    titleIdeas: coerceStringArray(src.titleIdeas, 12, 120),
    thumbnailIdeas: coerceStringArray(src.thumbnailIdeas, 10, 160),
    bestDocumentaryAngle: coerceString(src.bestDocumentaryAngle, `Documentary deep-dive on ${topic}.`),
    bestFacelessAngle: coerceString(src.bestFacelessAngle, `Faceless narration with archival-style visuals.`),
    recommendedStructure: coerceString(
      src.recommendedStructure,
      'Hook → context → rare facts → conflict → reveal → future → CTA.'
    ),
  }
}

/** Parse and validate raw LLM JSON into a complete {@link DeepResearchReport}. */
export function normalizeDeepResearchReport(raw: unknown, topic: string): DeepResearchReport {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const hookAngles = coerceHookAngles(src.hookAngles)

  return {
    topic: coerceString(src.topic, topic),
    overview: coerceOverview(src.overview, topic),
    hookAngles,
    timeline: coerceTimeline(src.timeline),
    rareFacts: coerceRareFacts(src.rareFacts),
    shockingStories: coerceStories(src.shockingStories),
    controversies: coerceControversies(src.controversies),
    psychology: coercePsychology(src.psychology),
    metaphors: coerceMetaphors(src.metaphors),
    futureImplications: coerceFuture(src.futureImplications),
    storyboardIdeas: coerceStoryboardIdeas(src.storyboardIdeas),
    writersGoldmine: coerceGoldmine(src.writersGoldmine, topic, hookAngles),
    retentionEngineering: coerceRetention(src.retentionEngineering),
    factChecking: coerceFactChecking(src.factChecking),
    finalSummary: coerceFinalSummary(src.finalSummary, topic),
  }
}

/** Minimum viable report — used to accept LLM output. */
export function hasUsableDeepResearchReport(report: DeepResearchReport): boolean {
  const hookCount = report.hookAngles.filter((h) => h.hookLine).length
  const factCount = report.rareFacts.length
  const storyboardCount = report.storyboardIdeas.length
  const hasOverview = Boolean(report.overview.oneSentenceSummary && report.overview.whyItMatters)
  const hasGoldmine = Boolean(report.writersGoldmine.strongestHook)
  return hasOverview && hasGoldmine && (hookCount >= 2 || factCount >= 2) && storyboardCount >= 5
}

/** Serialize report to markdown for legacy script-context injection. */
export function serializeDeepResearchReport(report: DeepResearchReport): string {
  const lines: string[] = [
    `# Deep Research: ${report.topic}`,
    '',
    '## Topic Overview',
    `- Beginner: ${report.overview.beginnerExplanation}`,
    `- Expert: ${report.overview.expertExplanation}`,
    `- Summary: ${report.overview.oneSentenceSummary}`,
    `- Why it matters: ${report.overview.whyItMatters}`,
    '',
    '## Viral Hook Angles',
    ...report.hookAngles.map(
      (h) =>
        `- **${h.title}**: ${h.hookLine} (gap: ${h.curiosityGap}; trigger: ${h.audienceTrigger})`
    ),
    '',
    '## Historical Timeline',
    ...report.timeline.map((e) => `- ${e.year}: ${e.event} — ${e.significance}`),
    '',
    '## Rare Facts',
    ...report.rareFacts.map((f) => `- ${f.fact} (${f.surpriseLevel}; ${f.sourceHint})`),
    '',
    '## Shocking Stories',
    ...report.shockingStories.map((s) => `- **${s.title}**: ${s.summary} [${s.emotionalBeat}]`),
    '',
    '## Controversies',
    ...report.controversies.map(
      (c) => `- Claim: ${c.claim} | Counter: ${c.opposingView} | Stakes: ${c.stakes}`
    ),
    '',
    '## Psychology',
    `- Emotions: ${report.psychology.coreEmotions.join(', ')}`,
    `- Biases: ${report.psychology.cognitiveBiases.join(', ')}`,
    `- Motivation: ${report.psychology.viewerMotivation}`,
    `- Triggers: ${report.psychology.fearDesireTriggers.join(', ')}`,
    '',
    '## Comparisons & Metaphors',
    ...report.metaphors.map((m) => `- ${m.metaphor} → ${m.explains}`),
    '',
    '## Future Implications',
    ...report.futureImplications.map(
      (f) => `- ${f.prediction} (${f.timeframe}): ${f.implication}`
    ),
    '',
    '## Visual Storyboard Ideas',
    ...report.storyboardIdeas.map(
      (s) =>
        `- **${s.sceneTitle}**: ${s.visualDescription} | Camera: ${s.cameraStyle} | Light: ${s.lightingMood} | Mood: ${s.atmosphere} | Purpose: ${s.emotionalPurpose}`
    ),
    '',
    "## Script Writer's Goldmine",
    `- Strongest hook: ${report.writersGoldmine.strongestHook}`,
    `- Story angle: ${report.writersGoldmine.strongestStoryAngle}`,
    `- Conflict: ${report.writersGoldmine.strongestConflict}`,
    `- Reveal: ${report.writersGoldmine.strongestReveal}`,
    `- Ending: ${report.writersGoldmine.strongestEnding}`,
    '',
    '## Retention Engineering',
    `- Opening: ${report.retentionEngineering.openingPattern}`,
    `- Re-hooks: ${report.retentionEngineering.rehookMoments.join(' | ')}`,
    `- Payoffs: ${report.retentionEngineering.payoffBeats.join(' | ')}`,
    `- Drop-off risks: ${report.retentionEngineering.dropOffRisks.join(' | ')}`,
    '',
    '## Fact Checking',
    `- High confidence: ${report.factChecking.highConfidenceFacts.join(' | ')}`,
    `- Verify: ${report.factChecking.needsVerification.join(' | ')}`,
    `- Common mistakes: ${report.factChecking.commonMistakes.join(' | ')}`,
    '',
    '## Final Recommendations',
    `- Top discoveries: ${report.finalSummary.top10Discoveries.join(' | ')}`,
    `- Titles: ${report.finalSummary.titleIdeas.join(' | ')}`,
    `- Thumbnails: ${report.finalSummary.thumbnailIdeas.join(' | ')}`,
    `- Documentary angle: ${report.finalSummary.bestDocumentaryAngle}`,
    `- Faceless angle: ${report.finalSummary.bestFacelessAngle}`,
    `- Structure: ${report.finalSummary.recommendedStructure}`,
  ]

  return lines.join('\n').trim()
}

/** Structured research context for script generation — prefers goldmine, facts, stories, hooks. */
export function buildDeepResearchReportScriptContext(report: DeepResearchReport): string {
  const gold = report.writersGoldmine
  const hooks = report.hookAngles.slice(0, 6)
  const facts = report.rareFacts.slice(0, 8)
  const stories = report.shockingStories.slice(0, 4)
  const psych = report.psychology

  return [
    '═══ DEEP RESEARCH CONTEXT (structured report — use as factual/creative fuel) ═══',
    'Prefer writersGoldmine, rareFacts, shockingStories, hookAngles, and psychology below.',
    'Do NOT write generic motivational content — anchor narration in these specifics.',
    'Training-knowledge research only — verify nothing requires live web sources.',
    '---',
    `TOPIC: ${report.topic}`,
    `ONE-LINE: ${report.overview.oneSentenceSummary}`,
    '',
    'WRITERS GOLDMINE:',
    `- Hook: ${gold.strongestHook}`,
    `- Angle: ${gold.strongestStoryAngle}`,
    `- Conflict: ${gold.strongestConflict}`,
    `- Reveal: ${gold.strongestReveal}`,
    `- Ending: ${gold.strongestEnding}`,
    '',
    'HOOK ANGLES:',
    ...hooks.map((h) => `- ${h.hookLine} (${h.curiosityGap})`),
    '',
    'RARE FACTS:',
    ...facts.map((f) => `- ${f.fact}`),
    '',
    'SHOCKING STORIES:',
    ...stories.map((s) => `- ${s.title}: ${s.summary}`),
    '',
    'PSYCHOLOGY:',
    `- Emotions: ${psych.coreEmotions.join(', ')}`,
    `- Motivation: ${psych.viewerMotivation}`,
    `- Triggers: ${psych.fearDesireTriggers.join(', ')}`,
    '',
    'RETENTION:',
    `- Opening: ${report.retentionEngineering.openingPattern}`,
    `- Re-hooks: ${report.retentionEngineering.rehookMoments.slice(0, 5).join(' | ')}`,
    '---',
  ].join('\n')
}

/** Build mock typed report when no API keys are available. */
export function buildMockDeepResearchReport(topic: string): DeepResearchReport {
  const hookLine = `Everyone talks about ${topic} — but almost nobody mentions this part.`
  return normalizeDeepResearchReport(
    {
      topic,
      overview: {
        beginnerExplanation: `${topic} has a surface story most creators repeat verbatim.`,
        expertExplanation: `The expert layer of ${topic} hides a tension between public narrative and underlying mechanics.`,
        oneSentenceSummary: `${topic} is not what the algorithm-trained audience thinks it is.`,
        whyItMatters: `Viewers stay when ${topic} reframes something they thought they already understood.`,
      },
      hookAngles: [
        {
          title: 'Hidden pivot',
          hookLine,
          curiosityGap: 'What happened in the gap between headline and history?',
          audienceTrigger: 'Incompletion — the brain hates an open loop',
        },
        {
          title: 'Contrarian frame',
          hookLine: `The popular story about ${topic} is almost backwards.`,
          curiosityGap: 'Which “common knowledge” fact collapses under scrutiny?',
          audienceTrigger: 'Status threat — fear of being wrong in public',
        },
      ],
      timeline: [
        {
          year: 'Origin',
          event: `${topic} enters public consciousness`,
          significance: 'Sets the baseline myth the script must puncture early',
        },
      ],
      rareFacts: [
        {
          fact: `A specific detail about ${topic} that contradicts the popular mental model`,
          sourceHint: 'training knowledge',
          surpriseLevel: 'high',
        },
        {
          fact: `A counterintuitive timeline beat about ${topic} worth teasing in the first 30 seconds`,
          sourceHint: 'training knowledge',
          surpriseLevel: 'medium',
        },
      ],
      shockingStories: [
        {
          title: 'The moment everything flipped',
          summary: `A concrete episode in ${topic}'s history that changes how the audience feels`,
          emotionalBeat: 'disbelief → reframe',
        },
      ],
      controversies: [
        {
          claim: `Mainstream framing of ${topic}`,
          opposingView: 'What insiders and skeptics argue instead',
          stakes: 'Who benefits from the simplified story',
        },
      ],
      psychology: {
        coreEmotions: ['curiosity', 'unease', 'validation'],
        cognitiveBiases: ['confirmation bias', 'availability heuristic'],
        viewerMotivation: 'Feel smart without feeling lectured',
        fearDesireTriggers: ['fear of missing the real story', 'desire for insider knowledge'],
      },
      metaphors: [
        {
          metaphor: `${topic} is like a locked room`,
          explains: 'The audience thinks they know what is inside — the script picks the lock',
        },
      ],
      futureImplications: [
        {
          prediction: `Where ${topic} is heading in the next 3–5 years`,
          timeframe: '3–5 years',
          implication: 'Stakes for the viewer today',
        },
      ],
      storyboardIdeas: Array.from({ length: 25 }, (_, i) => ({
        sceneTitle: `Beat ${i + 1}`,
        visualDescription: `Visual metaphor for ${topic} — frame ${i + 1}`,
        cameraStyle: i % 3 === 0 ? 'slow push-in' : 'static wide',
        lightingMood: i % 2 === 0 ? 'low-key contrast' : 'soft ambient',
        atmosphere: 'documentary tension',
        emotionalPurpose: i < 5 ? 'hook' : i < 15 ? 'build' : 'payoff',
      })),
      writersGoldmine: {
        strongestHook: hookLine,
        strongestStoryAngle: `The hidden narrative layer of ${topic}`,
        strongestConflict: 'Popular belief vs. documented reality',
        strongestReveal: 'The pivot that reframes the entire topic',
        strongestEnding: 'Close with a question that lingers after the credits',
      },
      retentionEngineering: {
        openingPattern: 'Bold claim → immediate proof tease → open loop',
        rehookMoments: [
          'But that is only half the story…',
          'Here is what textbooks leave out…',
          'The part nobody talks about starts here…',
        ],
        payoffBeats: ['Myth bust', 'Emotional story beat', 'Future implication'],
        dropOffRisks: ['Generic overview in minute 2', 'Too many names/dates without stakes'],
      },
      factChecking: {
        highConfidenceFacts: [`Core definitional facts about ${topic}`],
        needsVerification: ['Any statistic that would require a primary source on-camera'],
        commonMistakes: ['Repeating the viral myth without framing it as myth'],
      },
      finalSummary: {
        top10Discoveries: Array.from({ length: 10 }, (_, i) => `Discovery ${i + 1} about ${topic}`),
        titleIdeas: [
          `The Real Story of ${topic}`,
          `What Nobody Tells You About ${topic}`,
          `${topic}: The Part They Skip`,
        ],
        thumbnailIdeas: ['Split face reaction + bold contrast object', 'Before/after narrative split'],
        bestDocumentaryAngle: `Slow-burn investigative documentary on ${topic}`,
        bestFacelessAngle: `Faceless narration with archival-style motion graphics`,
        recommendedStructure: 'Hook → context → rare facts → conflict → reveal → future → CTA',
      },
    },
    topic
  )
}
