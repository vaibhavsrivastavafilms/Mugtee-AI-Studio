import type { HookType } from '@/lib/virlo/types'

const HOOK_PATTERNS: Array<{ type: HookType; pattern: RegExp; triggerTemplate: string }> = [
  {
    type: 'contrarian',
    pattern: /\b(stop|don't|never|unpopular|everyone|wrong|instead|contrarian|hot take)\b/i,
    triggerTemplate: 'Challenge the default advice about {topic}',
  },
  {
    type: 'warning',
    pattern: /\b(warning|mistake|fail|lost|cost|danger|risk|avoid)\b/i,
    triggerTemplate: 'Surface the hidden cost of {topic}',
  },
  {
    type: 'number',
    pattern: /\b(\d+\s*(day|week|month|year|tip|habit|tool|step)|#\d+)\b/i,
    triggerTemplate: 'Quantify the stakes with a specific number around {topic}',
  },
  {
    type: 'question',
    pattern: /\?|^(what|why|how|are you|did you)\b/i,
    triggerTemplate: 'Open with a question the audience cannot ignore about {topic}',
  },
  {
    type: 'story',
    pattern: /\b(i |my |when i|story|journey|happened|realized)\b/i,
    triggerTemplate: 'Start mid-scene in a personal moment tied to {topic}',
  },
  {
    type: 'curiosity',
    pattern: /\b(secret|nobody|hidden|actually|truth|reveal|surprising)\b/i,
    triggerTemplate: 'Create an information gap the audience must close on {topic}',
  },
]

export type HookAnalysis = {
  hookType: HookType
  curiosityTrigger: string
  confidence: number
}

/** Detect dominant hook type and curiosity trigger from content. */
export function analyzeHook(content: string, topic?: string): HookAnalysis {
  const topicLabel = topic?.trim() || 'this topic'
  let best: { type: HookType; score: number; trigger: string } = {
    type: 'curiosity',
    score: 1,
    trigger: HOOK_PATTERNS[5]!.triggerTemplate.replace('{topic}', topicLabel),
  }

  for (const { type, pattern, triggerTemplate } of HOOK_PATTERNS) {
    const matches = content.match(pattern)
    const score = matches ? matches.length + (pattern.test(content.slice(0, 120)) ? 2 : 0) : 0
    if (score > best.score) {
      best = {
        type,
        score,
        trigger: triggerTemplate.replace('{topic}', topicLabel),
      }
    }
  }

  const firstLine = content.split(/[.!?\n]/)[0]?.trim()
  if (firstLine && firstLine.length > 12 && firstLine.length < 140) {
    best.trigger = firstLine
  }

  return {
    hookType: best.type,
    curiosityTrigger: best.trigger,
    confidence: Math.min(92, 55 + best.score * 8),
  }
}
