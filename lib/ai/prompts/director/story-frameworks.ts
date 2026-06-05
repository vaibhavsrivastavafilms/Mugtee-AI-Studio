/** Seven cinematic story frameworks for AI Story Director. */

export const STORY_FRAMEWORK_IDS = [
  'belief-shift',
  'transformation-story',
  'failure-to-wisdom',
  'experiment-story',
  'contrarian-reveal',
  'creator-spotlight',
  'evolution-story',
] as const

export type StoryFrameworkId = (typeof STORY_FRAMEWORK_IDS)[number]

export type StoryFrameworkAct = {
  name: string
  purpose: string
  beats: string[]
}

export type StoryFrameworkDefinition = {
  id: StoryFrameworkId
  label: string
  tagline: string
  bestFor: string[]
  structure: StoryFrameworkAct[]
  emotionalArc: string
  hookPattern: string
}

export const STORY_FRAMEWORKS: Record<StoryFrameworkId, StoryFrameworkDefinition> = {
  'belief-shift': {
    id: 'belief-shift',
    label: 'Belief Shift',
    tagline: 'Challenge what the audience assumes is true',
    bestFor: ['myth-busting', 'education', 'contrarian takes', 'psychology'],
    structure: [
      {
        name: 'Act 1 — False Belief',
        purpose: 'Mirror the audience’s current assumption',
        beats: ['Open on the belief everyone repeats', 'Show why it feels true', 'Plant doubt with one vivid counter-example'],
      },
      {
        name: 'Act 2 — Cracks in the Model',
        purpose: 'Evidence that destabilizes the belief',
        beats: ['Stack 2–3 specific proofs', 'Personal or observed failure of the old belief', 'Raise stakes — what this belief costs them'],
      },
      {
        name: 'Act 3 — New Lens',
        purpose: 'Install the reframed truth',
        beats: ['Deliver the belief shift in one memorable line', 'Show life under the new belief', 'Close with identity-level takeaway'],
      },
    ],
    emotionalArc: 'comfort → discomfort → clarity',
    hookPattern: 'You’ve been told X — here’s what actually happens when…',
  },
  'transformation-story': {
    id: 'transformation-story',
    label: 'Transformation Story',
    tagline: 'Before → struggle → after with emotional specificity',
    bestFor: ['personal brand', 'fitness', 'habits', 'career pivots'],
    structure: [
      {
        name: 'Act 1 — Before State',
        purpose: 'Establish relatable starting point',
        beats: ['Sensory snapshot of “before”', 'Name the hidden cost', 'Tease the turning point without revealing it'],
      },
      {
        name: 'Act 2 — The Work',
        purpose: 'Show struggle, not montage magic',
        beats: ['One failure or setback', 'The decision or ritual that changed everything', 'Micro-wins that build momentum'],
      },
      {
        name: 'Act 3 — After + Proof',
        purpose: 'Earned transformation',
        beats: ['Contrast shot / line vs Act 1', 'What still isn’t perfect (credibility)', 'Invite viewer into their own version'],
      },
    ],
    emotionalArc: 'stagnation → friction → empowerment',
    hookPattern: 'Six months ago I couldn’t ___. Then one thing changed…',
  },
  'failure-to-wisdom': {
    id: 'failure-to-wisdom',
    label: 'Failure To Wisdom',
    tagline: 'A costly mistake becomes transferable insight',
    bestFor: ['business', 'creator economy', 'finance', 'honest storytelling'],
    structure: [
      {
        name: 'Act 1 — The Mistake',
        purpose: 'Confession with specificity',
        beats: ['What I did wrong (no vague “I failed”)', 'What I thought would happen', 'First consequence on screen'],
      },
      {
        name: 'Act 2 — The Fallout',
        purpose: 'Emotional and practical cost',
        beats: ['Escalating consequences', 'The moment I knew it was real', 'What I almost quit because of'],
      },
      {
        name: 'Act 3 — Extracted Wisdom',
        purpose: 'Gift the lesson',
        beats: ['Rule or framework born from pain', 'How I apply it now', 'Warning sign for the viewer'],
      },
    ],
    emotionalArc: 'hubris → humility → grounded confidence',
    hookPattern: 'I lost ___ because of this one mistake — don’t repeat it',
  },
  'experiment-story': {
    id: 'experiment-story',
    label: 'Experiment Story',
    tagline: 'Hypothesis → test → surprising result',
    bestFor: ['productivity hacks', 'challenges', 'A/B lifestyle', 'science-y niches'],
    structure: [
      {
        name: 'Act 1 — Hypothesis',
        purpose: 'State the bet clearly',
        beats: ['What I’m testing and why now', 'Success criteria', 'What skeptics would say'],
      },
      {
        name: 'Act 2 — The Test',
        purpose: 'Document with tension',
        beats: ['Day-by-day or beat-by-beat evidence', 'Unexpected friction', 'Mid-test plot twist'],
      },
      {
        name: 'Act 3 — Verdict',
        purpose: 'Honest outcome',
        beats: ['Did it work? (nuanced answer)', 'Who should try it / skip it', 'Next experiment tease'],
      },
    ],
    emotionalArc: 'curiosity → suspense → informed surprise',
    hookPattern: 'I tried ___ for 30 days — the result wasn’t what I expected',
  },
  'contrarian-reveal': {
    id: 'contrarian-reveal',
    label: 'Contrarian Reveal',
    tagline: 'Industry norm inverted with proof',
    bestFor: ['marketing', 'luxury', 'thought leadership', 'hot takes with substance'],
    structure: [
      {
        name: 'Act 1 — Sacred Cow',
        purpose: 'Name the norm everyone follows',
        beats: ['Show the default playbook', 'Why it’s seductive', 'Hint you broke it'],
      },
      {
        name: 'Act 2 — The Inversion',
        purpose: 'Show the opposite approach working',
        beats: ['Your contrarian move', 'Evidence / results', 'Objections addressed visually'],
      },
      {
        name: 'Act 3 — Reframe',
        purpose: 'New rule for the audience',
        beats: ['Principle behind the inversion', 'When NOT to use it', 'Memorable closing line'],
      },
    ],
    emotionalArc: 'conformity → disruption → selective rebellion',
    hookPattern: 'Everyone does X. I stopped — and ___ happened',
  },
  'creator-spotlight': {
    id: 'creator-spotlight',
    label: 'Creator Spotlight',
    tagline: 'Process, POV, and craft on display',
    bestFor: ['behind-the-scenes', 'tutorials with story', 'portfolio pieces'],
    structure: [
      {
        name: 'Act 1 — The Spark',
        purpose: 'Why this piece exists',
        beats: ['Origin of the idea', 'Constraint or brief', 'What success looks like'],
      },
      {
        name: 'Act 2 — Craft in Motion',
        purpose: 'Show decisions, not just output',
        beats: ['2–3 pivotal creative choices', 'Problem → fix moment', 'Taste / standards revealed'],
      },
      {
        name: 'Act 3 — The Piece + Invitation',
        purpose: 'Deliver and connect',
        beats: ['Final reveal or excerpt', 'What you’d do differently', 'Call to engage with the work'],
      },
    ],
    emotionalArc: 'intrigue → admiration → belonging',
    hookPattern: 'Here’s how I made ___ — and the part nobody shows',
  },
  'evolution-story': {
    id: 'evolution-story',
    label: 'Evolution Story',
    tagline: 'Version 1 → iterations → who you are now',
    bestFor: ['long-form creators', 'skill journeys', 'brand evolution'],
    structure: [
      {
        name: 'Act 1 — Version 1',
        purpose: 'Humble or cringe early work',
        beats: ['Show early attempt (specific)', 'What was missing', 'Why you didn’t quit'],
      },
      {
        name: 'Act 2 — Iterations',
        purpose: 'Compound improvements',
        beats: ['Key upgrades over time', 'Feedback or data that guided you', 'Identity shift moment'],
      },
      {
        name: 'Act 3 — Present Standard',
        purpose: 'Current craft + horizon',
        beats: ['Today’s bar', 'What you’re optimizing next', 'Viewer’s evolution prompt'],
      },
    ],
    emotionalArc: 'embarrassment → pride → forward momentum',
    hookPattern: 'My first ___ vs now — the gap is the lesson',
  },
}

const FRAMEWORK_KEYWORDS: Record<StoryFrameworkId, RegExp> = {
  'belief-shift': /\b(belief|myth|wrong|truth|assume|misconception|actually|debunk)\b/i,
  'transformation-story': /\b(transform|before|after|journey|change|habit|become|used to)\b/i,
  'failure-to-wisdom': /\b(fail|mistake|loss|learned|regret|wrong|lesson|costly)\b/i,
  'experiment-story': /\b(try|test|experiment|challenge|days|week|hypothesis|results)\b/i,
  'contrarian-reveal': /\b(everyone|contrarian|unpopular|stop|instead|opposite|norm)\b/i,
  'creator-spotlight': /\b(how i made|behind|process|craft|create|build|studio|workflow)\b/i,
  'evolution-story': /\b(first|evolution|version|improve|growth|then vs now|progress)\b/i,
}

function hashTopic(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

export type SelectStoryFrameworkInput = {
  userIdea: string
  niche?: string
  hookStyle?: string
  emotionalGoal?: string
  /** When set, skip auto-select */
  frameworkId?: StoryFrameworkId | null
}

/** Score frameworks by keyword fit + niche; deterministic tie-break via topic hash. */
export function selectStoryFramework(input: SelectStoryFrameworkInput): StoryFrameworkId {
  if (input.frameworkId && STORY_FRAMEWORKS[input.frameworkId]) {
    return input.frameworkId
  }

  const blob = [input.userIdea, input.niche, input.emotionalGoal, input.hookStyle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const scores = STORY_FRAMEWORK_IDS.map((id) => {
    let score = FRAMEWORK_KEYWORDS[id].test(blob) ? 3 : 0
    const fw = STORY_FRAMEWORKS[id]
    for (const tag of fw.bestFor) {
      if (blob.includes(tag.replace(/-/g, ' ')) || blob.includes(tag)) score += 1
    }
    if (input.niche) {
      const niche = input.niche.toLowerCase()
      if (niche.includes('psych') && id === 'belief-shift') score += 2
      if (niche.includes('fitness') && id === 'transformation-story') score += 2
      if (niche.includes('finance') && id === 'failure-to-wisdom') score += 2
      if (niche.includes('documentary') && id === 'evolution-story') score += 1
    }
    return { id, score }
  })

  scores.sort((a, b) => b.score - a.score)
  const top = scores[0]!
  if (top.score > 0) return top.id

  const seed = hashTopic(blob || 'story')
  return STORY_FRAMEWORK_IDS[seed % STORY_FRAMEWORK_IDS.length]!
}

export function formatFrameworkForPrompt(id: StoryFrameworkId): string {
  const fw = STORY_FRAMEWORKS[id]
  const acts = fw.structure
    .map(
      (act) =>
        `${act.name}\n  Purpose: ${act.purpose}\n  Beats:\n${act.beats.map((b) => `    - ${b}`).join('\n')}`
    )
    .join('\n\n')
  return [
    `FRAMEWORK: ${fw.label}`,
    `Tagline: ${fw.tagline}`,
    `Emotional arc: ${fw.emotionalArc}`,
    `Hook pattern: ${fw.hookPattern}`,
    `Structure:\n${acts}`,
  ].join('\n')
}

export function storyFrameworkLabel(id: StoryFrameworkId): string {
  return STORY_FRAMEWORKS[id].label
}
