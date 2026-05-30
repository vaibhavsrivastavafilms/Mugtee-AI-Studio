import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  DEEP_RESEARCH_SOP_MINIMUMS,
  type Controversy,
  type DeepResearchReport,
  type FactValidation,
  type FinalRecommendations,
  type FuturePrediction,
  type HookAngle,
  type Metaphor,
  type PsychologyInsights,
  type RareFact,
  type RetentionPlan,
  type StoryboardIdea,
  type StoryCase,
  type TimelineEvent,
  type TopicOverview,
  type WritersGoldmine,
} from '@/types/deep-research'

/** SOP section titles — 13 sections + final output. */
export const DEEP_RESEARCH_SOP_SECTIONS = [
  'Topic Overview',
  'Viral Hook Angles',
  'Deep Historical Timeline',
  'Rare Facts',
  'Shocking Stories',
  'Controversies & Debates',
  'Psychology of the Topic',
  'Viral Comparisons & Metaphors',
  'Future Implications',
  'Visual Storyboard Ideas',
  "Script Writer's Goldmine",
  'Retention Engineering',
  'Fact Checking',
  'Final Output',
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
    { "title": "string", "hookLine": "string", "curiosityGap": "string", "audienceTrigger": "string", "score": 8 }
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
    "top10Angles": ["string"],
    "titleIdeas": ["string"],
    "thumbnailIdeas": ["string"],
    "bestDocumentaryAngle": "string",
    "bestFacelessAngle": "string",
    "recommendedStructure": "string",
    "scriptFlow": "string — 1200-1500 word spoken documentary flow outline with section headers"
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

/** User prompt — 13-section SOP + final output with embedded JSON schema. */
export function buildDeepResearchSopPrompt(topic: string, language?: ProjectLanguage): string {
  const trimmed = topic.trim()
  const langLock = language ? `\n${languageDirective(language)}\n` : ''
  const min = DEEP_RESEARCH_SOP_MINIMUMS

  return `Research this topic deeply for a faceless YouTube documentary script.

Topic: ${trimmed || '<YOUR TOPIC OR TITLE>'}
${langLock}
Use your training knowledge only — no live web search. Be specific, surprising, and script-ready.
If uncertain about a fact, note it in factChecking.needsVerification — do NOT invent citations.

Complete ALL 13 SOP sections plus Final Output as JSON fields:

1. Topic Overview — beginnerExplanation, expertExplanation, oneSentenceSummary, whyItMatters
2. Viral Hook Angles — MINIMUM ${min.hookAngles} hookAngles; each with title, hookLine, curiosityGap, audienceTrigger, score (1–10 retention potential)
3. Deep Historical Timeline — 8+ timeline events with year, event, significance (chronological)
4. Rare Facts — MINIMUM ${min.rareFacts} rareFacts with fact, sourceHint, surpriseLevel (low|medium|high)
5. Shocking Stories — ${min.shockingStories}+ shockingStories with title, summary, emotionalBeat
6. Controversies & Debates — ${min.controversies}+ controversies with claim, opposingView, stakes
7. Psychology of the Topic — coreEmotions, cognitiveBiases, viewerMotivation, fearDesireTriggers
8. Viral Comparisons & Metaphors — ${min.metaphors}+ metaphors with metaphor, explains
9. Future Implications — ${min.futureImplications}+ futureImplications with prediction, timeframe, implication
10. Visual Storyboard Ideas — MINIMUM ${min.storyboardIdeas} storyboardIdeas with sceneTitle, visualDescription, cameraStyle, lightingMood, atmosphere, emotionalPurpose
11. Script Writer's Goldmine — strongestHook, strongestStoryAngle, strongestConflict, strongestReveal, strongestEnding
12. Retention Engineering — openingPattern, rehookMoments (6+), payoffBeats (5+), dropOffRisks (4+)
13. Fact Checking — highConfidenceFacts (8+), needsVerification, commonMistakes

Final Output (finalSummary):
- top10Discoveries (${min.top10Discoveries} items)
- top10Angles (${min.top10Discoveries} best narrative angles)
- titleIdeas (${min.titleIdeas}+)
- thumbnailIdeas (${min.thumbnailIdeas}+)
- bestDocumentaryAngle, bestFacelessAngle, recommendedStructure
- scriptFlow: ${min.scriptFlowWords.min}–${min.scriptFlowWords.max} word spoken-documentary flow outline with section headers (NOT the final script — beat-by-beat narration plan)

Return ONLY valid JSON matching this schema (fill every field; use [] only when truly irrelevant):

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

function coerceScore(value: unknown, fallback = 5): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(10, Math.max(1, Math.round(n)))
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
        score: coerceScore(row.score, 7),
      }
    })
    .filter((h) => h.hookLine || h.curiosityGap)
    .sort((a, b) => b.score - a.score)
    .slice(0, 28)
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
    .slice(0, 40)
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

function coerceFinalSummary(raw: unknown, topic: string, hooks: HookAngle[]): FinalRecommendations {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const angleFallback = hooks.slice(0, 10).map((h) => `${h.title}: ${h.hookLine}`)
  const flowFallback = [
    `# ${topic} — Documentary Flow Outline`,
    '',
    '## Cold Open (0:00–0:30)',
    `Pattern interrupt + ${hooks[0]?.hookLine || 'bold claim that reframes the topic'}.`,
    '',
    '## Context Layer (0:30–2:00)',
    `Beginner frame → expert pivot. Why ${topic} matters now.`,
    '',
    '## Rare Facts Montage (2:00–5:00)',
    'Stack 3–5 surprising facts with escalating stakes.',
    '',
    '## Shocking Story Beat (5:00–7:00)',
    'One concrete episode that changes how the audience feels.',
    '',
    '## Controversy & Debate (7:00–9:00)',
    'Present both sides — let tension build without preaching.',
    '',
    '## Psychology & Metaphor Bridge (9:00–10:30)',
    'Name the emotions and use one sticky comparison.',
    '',
    '## Future Implications (10:30–12:00)',
    'Where this is heading — stakes for the viewer today.',
    '',
    '## Payoff & Lingering Question (12:00–end)',
    'Strongest reveal → open loop that survives the credits.',
  ].join('\n')

  return {
    top10Discoveries: coerceStringArray(src.top10Discoveries, 10, 280),
    top10Angles: coerceStringArray(src.top10Angles, 10, 280).length
      ? coerceStringArray(src.top10Angles, 10, 280)
      : angleFallback,
    titleIdeas: coerceStringArray(src.titleIdeas, 12, 120),
    thumbnailIdeas: coerceStringArray(src.thumbnailIdeas, 10, 160),
    bestDocumentaryAngle: coerceString(src.bestDocumentaryAngle, `Documentary deep-dive on ${topic}.`),
    bestFacelessAngle: coerceString(src.bestFacelessAngle, `Faceless narration with archival-style visuals.`),
    recommendedStructure: coerceString(
      src.recommendedStructure,
      'Hook → context → rare facts → conflict → reveal → future → CTA.'
    ),
    scriptFlow: coerceString(src.scriptFlow, flowFallback, 12_000),
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
    finalSummary: coerceFinalSummary(src.finalSummary, topic, hookAngles),
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
        `- **${h.title}** [${h.score}/10]: ${h.hookLine} (gap: ${h.curiosityGap}; trigger: ${h.audienceTrigger})`
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
    '## Final Output',
    `- Top discoveries: ${report.finalSummary.top10Discoveries.join(' | ')}`,
    `- Top angles: ${report.finalSummary.top10Angles.join(' | ')}`,
    `- Titles: ${report.finalSummary.titleIdeas.join(' | ')}`,
    `- Thumbnails: ${report.finalSummary.thumbnailIdeas.join(' | ')}`,
    `- Documentary angle: ${report.finalSummary.bestDocumentaryAngle}`,
    `- Faceless angle: ${report.finalSummary.bestFacelessAngle}`,
    `- Structure: ${report.finalSummary.recommendedStructure}`,
    '',
    '### Script Flow (1200–1500 words)',
    report.finalSummary.scriptFlow,
  ]

  return lines.join('\n').trim()
}

/** Structured research context for script generation — all key dossier sections. */
export function buildDeepResearchReportScriptContext(report: DeepResearchReport): string {
  const gold = report.writersGoldmine
  const hooks = report.hookAngles.slice(0, 8)
  const facts = report.rareFacts.slice(0, 12)
  const stories = report.shockingStories.slice(0, 5)
  const timeline = report.timeline.slice(0, 6)
  const controversies = report.controversies.slice(0, 3)
  const metaphors = report.metaphors.slice(0, 5)
  const psych = report.psychology
  const final = report.finalSummary

  return [
    '═══ DEEP RESEARCH DOSSIER (structured — use as factual/creative fuel) ═══',
    'Prefer writersGoldmine, rareFacts, shockingStories, hookAngles, timeline, controversies, and scriptFlow.',
    'Do NOT write generic motivational content — anchor narration in these specifics.',
    'Training-knowledge research only — verify nothing requires live web sources.',
    '---',
    `TOPIC: ${report.topic}`,
    `ONE-LINE: ${report.overview.oneSentenceSummary}`,
    `WHY IT MATTERS: ${report.overview.whyItMatters}`,
    '',
    'WRITERS GOLDMINE:',
    `- Hook: ${gold.strongestHook}`,
    `- Angle: ${gold.strongestStoryAngle}`,
    `- Conflict: ${gold.strongestConflict}`,
    `- Reveal: ${gold.strongestReveal}`,
    `- Ending: ${gold.strongestEnding}`,
    '',
    'TOP HOOK ANGLES (by score):',
    ...hooks.map((h) => `- [${h.score}/10] ${h.hookLine} (${h.curiosityGap})`),
    '',
    'RARE FACTS:',
    ...facts.map((f) => `- ${f.fact}`),
    '',
    'SHOCKING STORIES:',
    ...stories.map((s) => `- ${s.title}: ${s.summary}`),
    '',
    'TIMELINE BEATS:',
    ...timeline.map((e) => `- ${e.year}: ${e.event}`),
    '',
    'CONTROVERSIES:',
    ...controversies.map((c) => `- ${c.claim} vs ${c.opposingView}`),
    '',
    'METAPHORS:',
    ...metaphors.map((m) => `- ${m.metaphor} → ${m.explains}`),
    '',
    'PSYCHOLOGY:',
    `- Emotions: ${psych.coreEmotions.join(', ')}`,
    `- Motivation: ${psych.viewerMotivation}`,
    `- Triggers: ${psych.fearDesireTriggers.join(', ')}`,
    '',
    'RETENTION:',
    `- Opening: ${report.retentionEngineering.openingPattern}`,
    `- Re-hooks: ${report.retentionEngineering.rehookMoments.slice(0, 5).join(' | ')}`,
    '',
    'RECOMMENDED STRUCTURE:',
    final.recommendedStructure,
    '',
    'SCRIPT FLOW OUTLINE (adapt — do not copy verbatim):',
    final.scriptFlow.slice(0, 6_000),
    '---',
  ].join('\n')
}

/** Visual storyboard ideas from dossier — for storyboard SOP pass. */
export function buildDeepResearchStoryboardContext(report: DeepResearchReport): string {
  const ideas = report.storyboardIdeas.slice(0, 30)
  if (ideas.length === 0) return ''

  return [
    '═══ DEEP RESEARCH STORYBOARD IDEAS (visual fuel — align segments when script allows) ═══',
    ...ideas.map(
      (s, i) =>
        `${i + 1}. ${s.sceneTitle}: ${s.visualDescription} | Camera: ${s.cameraStyle} | Mood: ${s.atmosphere} | Purpose: ${s.emotionalPurpose}`
    ),
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
      hookAngles: Array.from({ length: 20 }, (_, i) => ({
        title: `Hook angle ${i + 1}`,
        hookLine:
          i === 0
            ? hookLine
            : i % 2 === 0
              ? `The popular story about ${topic} is almost backwards.`
              : `What if everything you know about ${topic} is a cover story?`,
        curiosityGap: 'What happened in the gap between headline and history?',
        audienceTrigger: i % 3 === 0 ? 'Incompletion' : 'Status threat',
        score: 10 - Math.floor(i / 3),
      })),
      timeline: [
        {
          year: 'Origin',
          event: `${topic} enters public consciousness`,
          significance: 'Sets the baseline myth the script must puncture early',
        },
      ],
      rareFacts: Array.from({ length: 30 }, (_, i) => ({
        fact:
          i === 0
            ? `A specific detail about ${topic} that contradicts the popular mental model`
            : `Rare fact ${i + 1} about ${topic} worth teasing in narration`,
        sourceHint: 'training knowledge',
        surpriseLevel: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      })),
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
        top10Angles: Array.from({ length: 10 }, (_, i) => `Angle ${i + 1}: narrative frame for ${topic}`),
        titleIdeas: [
          `The Real Story of ${topic}`,
          `What Nobody Tells You About ${topic}`,
          `${topic}: The Part They Skip`,
        ],
        thumbnailIdeas: ['Split face reaction + bold contrast object', 'Before/after narrative split'],
        bestDocumentaryAngle: `Slow-burn investigative documentary on ${topic}`,
        bestFacelessAngle: `Faceless narration with archival-style motion graphics`,
        recommendedStructure: 'Hook → context → rare facts → conflict → reveal → future → CTA',
        scriptFlow: [
          `# ${topic} — Mock Documentary Flow`,
          '',
          '## Cold Open',
          hookLine,
          '',
          '## Context → Rare Facts → Conflict → Reveal → Future → CTA',
          `(Expand to ${DEEP_RESEARCH_SOP_MINIMUMS.scriptFlowWords.min}–${DEEP_RESEARCH_SOP_MINIMUMS.scriptFlowWords.max} words in live research.)`,
        ].join('\n'),
      },
    },
    topic
  )
}
