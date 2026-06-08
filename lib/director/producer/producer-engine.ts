import { generateScriptViaRouter, hasAnyTextProviderKey } from '@/lib/ai/providers/generation-bridge'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import {
  detectGenericIdea,
  generateChallengeReframes,
} from '@/lib/director/producer/producer-challenge'
import type {
  ChallengeReframe,
  ProducerAnalysisInput,
  ProducerRecommendations,
  ProducerReport,
  ProducerScoreFactors,
} from '@/lib/director/producer/types'
import { EMPTY_PRODUCER_MEMORY } from '@/lib/director/producer/types'

const PRODUCER_SYSTEM = `You are an executive producer for cinematic short-form content. You do NOT write scripts or generate content. You provide strategic creative feedback on story decisions BEFORE production.

Your role: challenge weak ideas, identify risks, surface missed opportunities, and score creative readiness. Never blindly approve — if the idea is generic, say so and push for specificity.

Return ONLY valid JSON:
{
  "scores": {
    "storyStrength": 0-100,
    "audienceFit": 0-100,
    "emotionalImpact": 0-100,
    "curiosity": 0-100,
    "visualPotential": 0-100,
    "retention": 0-100,
    "shareability": 0-100,
    "cinematicQuality": 0-100
  },
  "recommendations": {
    "strengths": [{ "id": "s1", "text": "..." }],
    "risks": [{ "id": "r1", "text": "..." }],
    "opportunities": [{ "id": "o1", "text": "..." }],
    "suggestions": [{ "id": "g1", "text": "..." }],
    "challengeReframes": [{ "id": "c1", "originalWeakness": "...", "reframe": "...", "rationale": "..." }]
  }
}

Rules:
- 2-4 items per recommendation category
- Each item needs a unique id (s1, r1, o1, g1, c1, etc.)
- Scores must reflect honest assessment — generic ideas score below 65 on storyStrength
- challengeReframes: 1-3 reframes if idea is weak/generic, else empty array
- Be specific to the creator's topic, not generic producer platitudes`

const SCORE_WEIGHTS: Record<keyof ProducerScoreFactors, number> = {
  storyStrength: 0.18,
  audienceFit: 0.12,
  emotionalImpact: 0.14,
  curiosity: 0.12,
  visualPotential: 0.1,
  retention: 0.14,
  shareability: 0.08,
  cinematicQuality: 0.12,
}

const PRODUCTION_READY_THRESHOLD = 75

/** Build the LLM prompt for executive producer analysis. */
export function buildProducerAnalysisPrompt(input: ProducerAnalysisInput): {
  systemPrompt: string
  userPrompt: string
} {
  const generic = detectGenericIdea(
    input.idea,
    input.storyDirection?.hook,
    input.storyDirection?.logline
  )

  const sections: string[] = [`CREATIVE PREMISE:\n${input.idea}`]

  if (input.storyDirection) {
    const d = input.storyDirection
    sections.push(
      [
        'STORY DIRECTION:',
        `Title: ${d.title}`,
        `Logline: ${d.logline}`,
        `Hook: ${d.hook}`,
        `Emotional promise: ${d.emotionalPromise}`,
        `Audience: ${d.audience}`,
      ].join('\n')
    )
  }

  if (input.framework) {
    const f = input.framework
    sections.push(
      [
        'STORY FRAMEWORK:',
        `Framework: ${f.label}`,
        `Core emotion: ${f.coreEmotion}`,
        `Audience desire: ${f.audienceDesire}`,
        `Narrative tension: ${f.narrativeTension}`,
        `Curiosity gap: ${f.curiosityGap}`,
        `Transformation: ${f.transformation}`,
      ].join('\n')
    )
  }

  if (input.frameworkAnalysis) {
    const a = input.frameworkAnalysis
    sections.push(
      [
        'FRAMEWORK SCAFFOLD:',
        `Act 1: ${a.act1}`,
        `Act 2: ${a.act2}`,
        `Conflict: ${a.conflict}`,
        `Escalation: ${a.escalation}`,
        `Breakthrough: ${a.breakthrough}`,
        `Resolution: ${a.resolution}`,
      ].join('\n')
    )
  }

  if (input.directorTreatment) {
    const t = input.directorTreatment
    sections.push(
      [
        'DIRECTOR TREATMENT:',
        `Genre: ${t.genre}`,
        `Mood: ${t.mood}`,
        `Emotional arc: ${t.emotionalArc}`,
        `Visual style: ${t.visualStyle}`,
        `Camera language: ${t.cameraLanguage}`,
        `Color palette: ${t.colorPalette}`,
      ].join('\n')
    )
  }

  if (input.blueprint) {
    const b = input.blueprint
    sections.push(
      [
        'BLUEPRINT:',
        `Title: ${b.title}`,
        `Hook: ${b.hook}`,
        `Summary: ${b.summary}`,
        b.script ? `Script excerpt: ${b.script.slice(0, 1500)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (input.creatorDna?.niche || input.creatorDna?.tone) {
    sections.push(
      [
        'CREATOR DNA:',
        input.creatorDna.niche ? `Niche: ${input.creatorDna.niche}` : '',
        input.creatorDna.tone ? `Tone: ${input.creatorDna.tone}` : '',
        input.creatorDna.platform ? `Platform: ${input.creatorDna.platform}` : '',
        input.creatorDna.emotionalGoal ? `Emotional goal: ${input.creatorDna.emotionalGoal}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (input.directorMemoryPrompt) {
    sections.push(input.directorMemoryPrompt)
  }

  if (input.producerMemoryPrompt) {
    sections.push(input.producerMemoryPrompt)
  }

  if (input.virloMarketPrompt) {
    sections.push(input.virloMarketPrompt)
  }

  if (generic.isGeneric) {
    sections.push(
      `CHALLENGE MODE ACTIVE — generic signals detected: ${generic.signals.join(', ')}. Score conservatively and provide challenge reframes.`
    )
  }

  const userPrompt = [
    ...sections,
    '',
    'Analyze this creative package as executive producer. Score all eight dimensions honestly. Provide strengths, risks, missed opportunities, and creative suggestions. Challenge weak elements.',
  ].join('\n\n')

  return { systemPrompt: PRODUCER_SYSTEM, userPrompt }
}

function clampScore(n: unknown): number {
  return Math.min(100, Math.max(0, Math.round(Number(n) || 0)))
}

function parseRecommendationItems(
  raw: unknown,
  category: 'strength' | 'risk' | 'opportunity' | 'suggestion',
  prefix: string
): Array<{ id: string; text: string; category: typeof category }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (typeof item === 'string') {
        return { id: `${prefix}${i + 1}`, text: item, category }
      }
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const text = String(r.text || r.message || '').trim()
      if (!text) return null
      return {
        id: String(r.id || `${prefix}${i + 1}`),
        text,
        category,
      }
    })
    .filter((x): x is { id: string; text: string; category: typeof category } => Boolean(x))
}

function parseChallengeReframes(raw: unknown): ChallengeReframe[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const reframe = String(r.reframe || '').trim()
      if (!reframe) return null
      return {
        id: String(r.id || `c${i + 1}`),
        originalWeakness: String(r.originalWeakness || r.weakness || 'Generic creative approach'),
        reframe,
        rationale: String(r.rationale || r.reason || ''),
      }
    })
    .filter((x): x is ChallengeReframe => Boolean(x))
}

/** Parse raw LLM output into structured producer report fields. */
export function parseProducerReport(
  raw: Record<string, unknown>,
  meta: { projectId: string; userId: string; reportId?: string }
): Omit<ProducerReport, 'createdAt' | 'updatedAt'> {
  const scoresRaw = (raw.scores ?? raw) as Record<string, unknown>
  const scores: ProducerScoreFactors = {
    storyStrength: clampScore(scoresRaw.storyStrength ?? scoresRaw.story_score),
    audienceFit: clampScore(scoresRaw.audienceFit ?? scoresRaw.audience_score),
    emotionalImpact: clampScore(scoresRaw.emotionalImpact ?? scoresRaw.emotion_score),
    curiosity: clampScore(scoresRaw.curiosity ?? scoresRaw.curiosity_score),
    visualPotential: clampScore(scoresRaw.visualPotential ?? scoresRaw.visual_score),
    retention: clampScore(scoresRaw.retention ?? scoresRaw.retention_score),
    shareability: clampScore(scoresRaw.shareability ?? scoresRaw.shareability_score),
    cinematicQuality: clampScore(scoresRaw.cinematicQuality ?? scoresRaw.cinematic_score),
  }

  const recRaw = (raw.recommendations ?? raw) as Record<string, unknown>
  const recommendations: ProducerRecommendations = {
    strengths: parseRecommendationItems(recRaw.strengths, 'strength', 's'),
    risks: parseRecommendationItems(recRaw.risks, 'risk', 'r'),
    opportunities: parseRecommendationItems(recRaw.opportunities ?? recRaw.missedOpportunities, 'opportunity', 'o'),
    suggestions: parseRecommendationItems(
      recRaw.suggestions ?? recRaw.creativeSuggestions,
      'suggestion',
      'g'
    ),
    challengeReframes: parseChallengeReframes(recRaw.challengeReframes),
  }

  const storyReadinessScore = computeStoryReadinessScore(scores)
  const productionReady = storyReadinessScore >= PRODUCTION_READY_THRESHOLD

  return {
    id: meta.reportId ?? crypto.randomUUID(),
    projectId: meta.projectId,
    userId: meta.userId,
    scores,
    storyReadinessScore,
    productionReady,
    readinessLabel: productionReady ? 'Production Ready' : 'Needs Refinement',
    recommendations,
    producerMemory: { ...EMPTY_PRODUCER_MEMORY },
  }
}

/** Compute composite story readiness score from weighted factors. */
export function computeStoryReadinessScore(factors: ProducerScoreFactors): number {
  let total = 0
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS) as Array<
    [keyof ProducerScoreFactors, number]
  >) {
    total += factors[key] * weight
  }
  return Math.round(total)
}

function heuristicProducerAnalysis(input: ProducerAnalysisInput): Record<string, unknown> {
  const generic = detectGenericIdea(
    input.idea,
    input.storyDirection?.hook,
    input.storyDirection?.logline
  )

  const baseStory = generic.isGeneric ? 52 : 72
  const hasDirection = Boolean(input.storyDirection?.logline)
  const hasFramework = Boolean(input.framework)
  const hasTreatment = Boolean(input.directorTreatment?.genre)
  const hasBlueprint = Boolean(input.blueprint?.hook)

  const boost = (hasDirection ? 8 : 0) + (hasFramework ? 6 : 0) + (hasTreatment ? 5 : 0) + (hasBlueprint ? 4 : 0)

  const scores: ProducerScoreFactors = {
    storyStrength: Math.min(95, baseStory + boost),
    audienceFit: hasDirection ? 78 : 60,
    emotionalImpact: input.storyDirection?.emotionalPromise ? 75 : 58,
    curiosity: input.framework?.curiosityGap ? 80 : 55,
    visualPotential: input.directorTreatment?.visualStyle ? 82 : 62,
    retention: hasBlueprint ? 76 : 58,
    shareability: 65,
    cinematicQuality: input.directorTreatment?.cameraLanguage ? 78 : 60,
  }

  const challengeReframes = generic.isGeneric
    ? generateChallengeReframes({
        idea: input.idea,
        hook: input.storyDirection?.hook,
        logline: input.storyDirection?.logline,
        signals: generic.signals,
        storyDirectionTitle: input.storyDirection?.title,
      })
    : []

  const strengths: Array<{ id: string; text: string }> = []
  const risks: Array<{ id: string; text: string }> = []
  const opportunities: Array<{ id: string; text: string }> = []
  const suggestions: Array<{ id: string; text: string }> = []

  if (hasDirection) {
    strengths.push({
      id: 's1',
      text: `Clear story direction: "${input.storyDirection!.title}" with a defined emotional promise.`,
    })
  }
  if (hasFramework) {
    strengths.push({
      id: 's2',
      text: `Narrative framework (${input.framework!.label}) provides structural scaffolding.`,
    })
  }
  if (hasTreatment) {
    strengths.push({
      id: 's3',
      text: `Director treatment establishes visual identity (${input.directorTreatment!.visualStyle || input.directorTreatment!.mood}).`,
    })
  }

  if (generic.isGeneric) {
    risks.push({
      id: 'r1',
      text: `Premise reads generic (${generic.signals.join(', ')}) — differentiation risk before production.`,
    })
  }
  if (!hasBlueprint || !input.blueprint?.hook) {
    risks.push({
      id: 'r2',
      text: 'Blueprint hook is underdeveloped — retention cliff likely in first 3 seconds.',
    })
  }
  if (!hasTreatment) {
    risks.push({
      id: 'r3',
      text: 'No director treatment locked — visual language may drift during production.',
    })
  }

  if (input.framework?.narrativeTension) {
    opportunities.push({
      id: 'o1',
      text: `Escalate "${input.framework.narrativeTension}" with a mid-video pattern interrupt.`,
    })
  }
  if (input.storyDirection?.audience) {
    opportunities.push({
      id: 'o2',
      text: `Tailor the payoff explicitly for: ${input.storyDirection.audience}.`,
    })
  }

  suggestions.push({
    id: 'g1',
    text: 'Lock the opening hook before character bible — it sets tone for every visual decision.',
  })
  if (challengeReframes.length) {
    suggestions.push({
      id: 'g2',
      text: 'Consider a challenge reframe below to sharpen the premise before proceeding.',
    })
  }

  return {
    scores,
    recommendations: {
      strengths,
      risks,
      opportunities,
      suggestions,
      challengeReframes,
    },
  }
}

/** Run full producer analysis via LLM with heuristic fallback. */
export async function runProducerAnalysis(
  input: ProducerAnalysisInput
): Promise<Omit<ProducerReport, 'createdAt' | 'updatedAt'>> {
  const meta = { projectId: '', userId: '' }
  const generic = detectGenericIdea(
    input.idea,
    input.storyDirection?.hook,
    input.storyDirection?.logline
  )
  input.isGenericIdea = generic.isGeneric
  input.genericSignals = generic.signals

  if (!hasAnyTextProviderKey()) {
    const raw = heuristicProducerAnalysis(input)
    return parseProducerReport(raw, { ...meta, projectId: 'pending', userId: 'pending' })
  }

  const { systemPrompt, userPrompt } = buildProducerAnalysisPrompt(input)

  try {
    const result = await generateScriptViaRouter({
      systemPrompt,
      userPrompt,
      topic: input.idea,
      temperature: 0.65,
      contextInput: {
        topic: input.idea,
        niche: input.creatorDna?.niche,
        tone: input.creatorDna?.tone,
        platform: input.creatorDna?.platform,
      },
    })

    const parsed = parseLlmJsonText(JSON.stringify(result.parsed))

    if (!parsed.scores && !parsed.recommendations) {
      const raw = heuristicProducerAnalysis(input)
      return parseProducerReport(raw, { ...meta, projectId: 'pending', userId: 'pending' })
    }

    const report = parseProducerReport(parsed, { ...meta, projectId: 'pending', userId: 'pending' })

    if (generic.isGeneric && report.recommendations.challengeReframes.length === 0) {
      report.recommendations.challengeReframes = generateChallengeReframes({
        idea: input.idea,
        hook: input.storyDirection?.hook,
        logline: input.storyDirection?.logline,
        signals: generic.signals,
        storyDirectionTitle: input.storyDirection?.title,
      })
    }

    return report
  } catch {
    const raw = heuristicProducerAnalysis(input)
    return parseProducerReport(raw, { ...meta, projectId: 'pending', userId: 'pending' })
  }
}
