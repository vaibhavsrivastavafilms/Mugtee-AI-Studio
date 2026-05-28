import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { EmotionalGoal } from '@/lib/virlo-engine/types'

const EMOTION_KEYWORDS: Record<EmotionalGoal, string[]> = {
  curiosity: ['why', 'secret', 'hidden', 'unknown', 'pattern', 'brain', 'mind', 'discover'],
  tension: ['cost', 'risk', 'trap', 'danger', 'before', 'until', 'never', 'always'],
  awe: ['universe', 'cosmos', 'infinite', 'scale', 'legacy', 'time', 'ancient', 'vast'],
  recognition: ['you', 'your', 'feel', 'alone', 'nobody', 'everyone', 'mirror', 'self'],
  urgency: ['now', 'today', 'deadline', 'running', 'late', 'miss', 'window', 'last'],
  intimacy: ['quiet', 'whisper', 'close', 'touch', 'breath', 'night', 'alone', 'soft'],
  defiance: ['refuse', 'break', 'stop', 'enough', 'fight', 'rebel', 'truth', 'real'],
}

const NICHE_DEFAULT_EMOTION: Record<CinematicNiche, EmotionalGoal> = {
  motivation: 'defiance',
  psychology: 'recognition',
  luxury: 'awe',
  documentary: 'curiosity',
  finance: 'tension',
  fitness: 'defiance',
  spirituality: 'intimacy',
  storytelling: 'recognition',
  'faceless reels': 'curiosity',
}

const EMOTION_NOTES: Record<EmotionalGoal, string[]> = {
  curiosity: [
    'Open with an unanswered question the viewer must resolve.',
    'Withhold the core insight until scene 3–4.',
    'Use precise nouns over abstract claims.',
  ],
  tension: [
    'Name the cost of inaction without preaching.',
    'Stack small stakes before the reveal.',
    'Let silence carry weight between beats.',
  ],
  awe: [
    'Scale up visually — macro to cosmic or vice versa.',
    'Use sensory detail: texture, light, distance.',
    'Land the insight as inevitable, not loud.',
  ],
  recognition: [
    'Speak directly to the viewer’s private experience.',
    'Validate before you challenge.',
    'Avoid diagnosing — mirror instead.',
  ],
  urgency: [
    'Anchor to a specific moment: tonight, this scroll, this choice.',
    'Short sentences in the hook window.',
    'Payoff must feel like relief, not hype.',
  ],
  intimacy: [
    'Lower the volume — whispered conviction beats shouting.',
    'Close framing, shallow depth, human detail.',
    'End on stillness, not a CTA scream.',
  ],
  defiance: [
    'Challenge a comfortable lie the audience believes.',
    'Use declarative rhythm — no hedging.',
    'Close with agency, not motivation cliché.',
  ],
}

function scoreEmotion(topic: string, goal: EmotionalGoal): number {
  const lower = topic.toLowerCase()
  return EMOTION_KEYWORDS[goal].reduce(
    (sum, word) => sum + (lower.includes(word) ? 1 : 0),
    0
  )
}

export function detectEmotionalGoal(
  topic: string,
  niche: CinematicNiche,
  seed: number
): EmotionalGoal {
  const scores = (Object.keys(EMOTION_KEYWORDS) as EmotionalGoal[]).map((goal) => ({
    goal,
    score: scoreEmotion(topic, goal),
  }))
  scores.sort((a, b) => b.score - a.score)

  if (scores[0]?.score > 0) return scores[0].goal

  const fallback = NICHE_DEFAULT_EMOTION[niche]
  const alternates = (Object.keys(NICHE_DEFAULT_EMOTION) as CinematicNiche[])
    .map((n) => NICHE_DEFAULT_EMOTION[n])
    .filter((g, i, arr) => arr.indexOf(g) === i)

  const rotate = alternates[seed % alternates.length]
  return seed % 3 === 0 ? rotate : fallback
}

export function emotionalNotesFor(goal: EmotionalGoal): string[] {
  return EMOTION_NOTES[goal]
}
