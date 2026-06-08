import {
  STORY_FRAMEWORK_IDS,
  STORY_FRAMEWORKS,
  selectStoryFramework,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'

const FRAMEWORK_KEYWORDS: Record<StoryFrameworkId, RegExp> = {
  'belief-shift': /\b(belief|myth|wrong|truth|assume|misconception|actually|debunk|everyone thinks)\b/i,
  'transformation-story': /\b(transform|before|after|journey|change|habit|become|used to|pivot)\b/i,
  'failure-to-wisdom': /\b(fail|mistake|loss|learned|regret|wrong|lesson|costly|lost)\b/i,
  'experiment-story': /\b(try|test|experiment|challenge|days|week|hypothesis|results|tried)\b/i,
  'contrarian-reveal': /\b(everyone|contrarian|unpopular|stop|instead|opposite|norm|hot take)\b/i,
  'creator-spotlight': /\b(how i made|behind|process|craft|create|build|studio|workflow|day in)\b/i,
  'routine-rewrite': /\b(routine|habit|morning|workflow|system|redesign|optimize|default|habits)\b/i,
}

export type FrameworkClassification = {
  framework: StoryFrameworkId
  confidence: number
  alternatives: Array<{ framework: StoryFrameworkId; confidence: number }>
}

/** Classify content into one of seven story frameworks with confidence. */
export function classifyFramework(
  content: string,
  opts?: { niche?: string; emotionalGoal?: string }
): FrameworkClassification {
  const blob = content.toLowerCase()
  const primary = selectStoryFramework({
    userIdea: content,
    niche: opts?.niche,
    emotionalGoal: opts?.emotionalGoal,
  })

  const scored = STORY_FRAMEWORK_IDS.map((id) => {
    let score = FRAMEWORK_KEYWORDS[id].test(blob) ? 40 : 10
    const fw = STORY_FRAMEWORKS[id]
    for (const tag of fw.bestFor) {
      if (blob.includes(tag.replace(/-/g, ' ')) || blob.includes(tag)) score += 8
    }
    if (id === primary) score += 25
    return { framework: id, score }
  }).sort((a, b) => b.score - a.score)

  const top = scored[0]!
  const maxScore = Math.max(top.score, 1)
  const confidence = Math.min(95, Math.round((top.score / maxScore) * 85 + 10))

  return {
    framework: top.framework,
    confidence,
    alternatives: scored.slice(1, 4).map((s) => ({
      framework: s.framework,
      confidence: Math.round((s.score / maxScore) * confidence * 0.85),
    })),
  }
}
