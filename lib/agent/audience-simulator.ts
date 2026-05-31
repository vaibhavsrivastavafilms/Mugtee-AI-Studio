import { reviewContentQualityRules } from '@/lib/quality/content-quality-review'
import type { AudiencePrediction } from '@/lib/agent/types'
import { clampScore } from '@/lib/agent/agent-context'

const SHARE_SIGNALS =
  /\b(you|your|never|secret|mistake|truth|remember|everyone|nobody|why|how)\b/i
const COMMENT_SIGNALS = /\?|what do you think|comment|agree|disagree|which one|tell me/i

export function simulateAudience(input: {
  hook?: string
  script?: string
  topic?: string
  platform?: string
  duration?: number
}): AudiencePrediction {
  const hook = input.hook?.trim() ?? ''
  const script = input.script?.trim() ?? input.topic?.trim() ?? ''
  const quality = reviewContentQualityRules({
    hook,
    script,
    platform: input.platform,
    duration: input.duration,
  })

  const b = quality.breakdown
  const retention = clampScore(b.retention * 10)
  const emotion = clampScore(b.emotion * 10)
  const curiosity = clampScore(b.hook * 10)
  const shareability = clampScore(
    (SHARE_SIGNALS.test(hook) ? 72 : 55) + (b.emotion >= 7 ? 12 : 0) + (b.hook >= 7 ? 8 : 0)
  )
  const commentPotential = clampScore(
    (COMMENT_SIGNALS.test(`${hook} ${script}`) ? 78 : 52) + (curiosity >= 70 ? 10 : 0)
  )

  const predictedPerformanceScore = clampScore(
    retention * 0.28 +
      emotion * 0.22 +
      curiosity * 0.22 +
      shareability * 0.16 +
      commentPotential * 0.12
  )

  let insight = 'Solid foundation — tighten the opening for a retention lift.'
  if (predictedPerformanceScore >= 80) {
    insight = 'Strong predicted performance — hook and emotion align with your audience patterns.'
  } else if (curiosity < 60) {
    insight = 'Curiosity is the bottleneck — try a question or information gap in the first line.'
  } else if (retention < 60) {
    insight = 'Retention risk in the middle — add a pattern interrupt before the payoff.'
  }

  return {
    predictedPerformanceScore,
    retention,
    emotion,
    curiosity,
    shareability,
    commentPotential,
    insight,
  }
}
