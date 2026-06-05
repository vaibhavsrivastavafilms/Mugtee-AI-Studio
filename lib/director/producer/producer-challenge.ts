const GENERIC_PATTERNS: Array<{ pattern: RegExp; signal: string }> = [
  { pattern: /\b(top\s*\d+|5\s+tips|10\s+ways|life\s+hacks?)\b/i, signal: 'listicle framing' },
  { pattern: /\b(motivat|inspir|mindset|grind|hustle)\b/i, signal: 'generic motivation' },
  { pattern: /\b(journey|unlock|transform your life|level up)\b/i, signal: 'vague transformation' },
  { pattern: /\b(secret|nobody talks about|they don't want you to know)\b/i, signal: 'clickbait cliché' },
  { pattern: /\b(how to be successful|be your best self|reach your potential)\b/i, signal: 'broad self-help' },
  { pattern: /\b(ultimate guide|everything you need|complete guide)\b/i, signal: 'encyclopedic framing' },
  { pattern: /\b(viral|trending|algorithm)\b/i, signal: 'platform-meta instead of story' },
]

const WEAK_HOOK_PATTERNS = [
  /^have you ever/i,
  /^in today's world/i,
  /^let me tell you/i,
  /^this is important/i,
]

export type GenericIdeaAssessment = {
  isGeneric: boolean
  signals: string[]
  severity: 'low' | 'medium' | 'high'
}

/** Detect generic or weak creative premises that need challenge reframes. */
export function detectGenericIdea(
  idea: string,
  hook?: string,
  logline?: string
): GenericIdeaAssessment {
  const blob = [idea, hook, logline].filter(Boolean).join(' ')
  const signals: string[] = []

  for (const { pattern, signal } of GENERIC_PATTERNS) {
    if (pattern.test(blob)) signals.push(signal)
  }

  if (hook) {
    for (const p of WEAK_HOOK_PATTERNS) {
      if (p.test(hook.trim())) {
        signals.push('weak opening hook')
        break
      }
    }
  }

  if (idea.trim().split(/\s+/).length < 6) {
    signals.push('underdeveloped premise')
  }

  const unique = [...new Set(signals)]
  const severity: GenericIdeaAssessment['severity'] =
    unique.length >= 3 ? 'high' : unique.length >= 1 ? 'medium' : 'low'

  return {
    isGeneric: unique.length >= 1,
    signals: unique,
    severity,
  }
}

export type ChallengeReframeInput = {
  idea: string
  hook?: string
  logline?: string
  signals: string[]
  storyDirectionTitle?: string
}

/** Generate challenge reframes for weak/generic ideas (heuristic fallback). */
export function generateChallengeReframes(input: ChallengeReframeInput): Array<{
  id: string
  originalWeakness: string
  reframe: string
  rationale: string
}> {
  const reframes: Array<{
    id: string
    originalWeakness: string
    reframe: string
    rationale: string
  }> = []

  const topic = input.idea.slice(0, 80) || 'this idea'

  if (input.signals.includes('listicle framing')) {
    reframes.push({
      id: 'challenge-listicle',
      originalWeakness: 'Listicle framing feels informational, not cinematic.',
      reframe: `Pick ONE contrarian insight from "${topic}" and build the entire piece around the moment you discovered it was wrong.`,
      rationale: 'Single-belief stories retain better than numbered tips.',
    })
  }

  if (input.signals.includes('generic motivation')) {
    reframes.push({
      id: 'challenge-motivation',
      originalWeakness: 'Motivation language is interchangeable across creators.',
      reframe: `Anchor "${topic}" in a specific failure — what you lost, what it cost, and the one decision that changed the outcome.`,
      rationale: 'Failure-to-wisdom arcs create emotional specificity.',
    })
  }

  if (input.signals.includes('vague transformation')) {
    reframes.push({
      id: 'challenge-transformation',
      originalWeakness: 'Transformation promise lacks a concrete before/after.',
      reframe: `Show the "before" state in scene 1 — messy, embarrassing, or costly — then earn the transformation through a visible experiment.`,
      rationale: 'Audiences need proof, not promises.',
    })
  }

  if (input.signals.includes('clickbait cliché')) {
    reframes.push({
      id: 'challenge-clickbait',
      originalWeakness: 'Clickbait framing erodes trust before the story begins.',
      reframe: `Replace the secret-reveal hook with an honest confession: "I believed X for years — here's what broke it."`,
      rationale: 'Confession hooks outperform manufactured secrecy.',
    })
  }

  if (input.signals.includes('weak opening hook')) {
    reframes.push({
      id: 'challenge-hook',
      originalWeakness: 'Opening hook sounds like a preamble, not a scroll-stopper.',
      reframe: `Start mid-action: a line of dialogue, a visual contradiction, or a number that shouldn't be true about "${topic}".`,
      rationale: 'In medias res hooks bypass audience skepticism.',
    })
  }

  if (input.signals.includes('underdeveloped premise')) {
    reframes.push({
      id: 'challenge-premise',
      originalWeakness: 'Premise is too thin to sustain retention.',
      reframe: `Add a stakes layer: who loses if this idea is ignored? Who wins if it's embraced? Name them.`,
      rationale: 'Stakes convert topics into stories.',
    })
  }

  if (reframes.length === 0 && input.signals.length > 0) {
    reframes.push({
      id: 'challenge-generic',
      originalWeakness: `Idea reads familiar — "${input.signals[0]}".`,
      reframe: `Reframe "${topic}" through a single unexpected lens: the skeptic, the insider, or the person who paid the price.`,
      rationale: 'POV specificity differentiates crowded topics.',
    })
  }

  return reframes.slice(0, 3)
}
