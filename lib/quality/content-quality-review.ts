import { analyzeEmotionalStory } from '@/lib/companion/emotional-analysis'
import type { EmotionalDimensionLabel } from '@/lib/companion/types'
import type {
  ContentQualityBreakdown,
  ContentQualityReviewInput,
  ContentQualityScore,
} from '@/lib/quality/types'

const POWER_WORDS =
  /\b(secret|never|nobody|mistake|truth|pattern|stop|before|until|discover|hidden|shocking|why)\b/i

const CTA_SIGNALS =
  /\b(follow|subscribe|comment|save|share|link|bio|tap|click|dm|try|start|join|learn)\b/i

function labelToScore(label: EmotionalDimensionLabel): number {
  if (label === 'Strong' || label === 'High' || label === 'Peak') return 9
  if (label === 'Building' || label === 'Smooth' || label === 'Steady') return 6
  if (label === 'Needs lift') return 3
  return 5
}

function hookHeuristicScore(hook: string): number {
  const h = hook.trim()
  if (!h) return 2
  let score = 4
  if (h.length >= 40 && h.length <= 180) score += 2
  if (/\?/.test(h)) score += 1.5
  if (POWER_WORDS.test(h)) score += 1.5
  if (/\b(you|your)\b/i.test(h)) score += 1
  if (h.length < 20) score -= 2
  return Math.max(0, Math.min(10, Math.round(score)))
}

function storytellingHeuristicScore(script: string): number {
  const s = script.trim()
  if (!s) return 3
  let score = 4
  if (/first|then|finally|but|so when|years later|until/i.test(s)) score += 2
  const beats = s.split(/\n+/).filter((l) => l.trim().length > 12)
  if (beats.length >= 3) score += Math.min(3, beats.length)
  if (s.length > 120) score += 1
  return Math.max(0, Math.min(10, Math.round(score)))
}

function ctaHeuristicScore(cta: string, script: string): number {
  const text = (cta || '').trim() || extractTrailingCta(script)
  if (!text) return 4
  let score = 5
  if (CTA_SIGNALS.test(text)) score += 2
  if (text.length >= 12 && text.length <= 120) score += 1
  if (/\!/.test(text) && text.length < 80) score += 0.5
  if (text.length < 8) score -= 2
  return Math.max(0, Math.min(10, Math.round(score)))
}

function extractTrailingCta(script: string): string {
  const lines = script.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const last = lines[lines.length - 1] ?? ''
  if (CTA_SIGNALS.test(last)) return last
  return ''
}

function buildSuggestions(breakdown: ContentQualityBreakdown): string[] {
  const entries: { key: keyof ContentQualityBreakdown; text: string }[] = [
    { key: 'hook', text: 'Sharpen the opening — add a question or a specific tension in the first line.' },
    {
      key: 'storytelling',
      text: 'Add one clear story turn (setup → tension → payoff) in the middle beats.',
    },
    { key: 'emotion', text: 'Name one feeling or stake so viewers feel why this matters.' },
    { key: 'retention', text: 'Shorten a dense middle beat or add a pattern interrupt before the payoff.' },
    { key: 'cta', text: 'End with one direct action — follow, save, or comment with a specific prompt.' },
  ]

  const sorted = [...entries].sort((a, b) => breakdown[a.key] - breakdown[b.key])
  const out: string[] = []
  for (const item of sorted) {
    if (breakdown[item.key] >= 7) continue
    out.push(item.text)
    if (out.length >= 3) break
  }
  if (!out.length) {
    out.push('Strong base — try a bolder hook variant or a tighter final CTA for extra lift.')
  }
  return out.slice(0, 3)
}

function overallFromBreakdown(breakdown: ContentQualityBreakdown): number {
  const weights = {
    hook: 0.28,
    storytelling: 0.22,
    emotion: 0.18,
    retention: 0.2,
    cta: 0.12,
  }
  const weighted =
    breakdown.hook * weights.hook +
    breakdown.storytelling * weights.storytelling +
    breakdown.emotion * weights.emotion +
    breakdown.retention * weights.retention +
    breakdown.cta * weights.cta
  return Math.max(0, Math.min(100, Math.round(weighted * 10)))
}

/** Rules-first content quality review — works offline without API keys. */
export function reviewContentQualityRules(input: ContentQualityReviewInput): ContentQualityScore {
  const hook = input.hook?.trim() ?? ''
  const script = input.script?.trim() ?? ''
  const cta = input.cta?.trim() ?? ''

  const emotional = analyzeEmotionalStory({
    hook,
    script,
    duration: input.duration,
  })

  const breakdown: ContentQualityBreakdown = {
    hook: Math.round((hookHeuristicScore(hook) + labelToScore(emotional.curiosity)) / 2),
    storytelling: Math.round(
      (storytellingHeuristicScore(script) + labelToScore(emotional.storyFlow)) / 2
    ),
    emotion: labelToScore(emotional.emotion),
    retention: labelToScore(emotional.retention),
    cta: ctaHeuristicScore(cta, script),
  }

  return {
    overall: overallFromBreakdown(breakdown),
    breakdown,
    suggestions: buildSuggestions(breakdown),
    reviewedAt: Date.now(),
  }
}

export function excerptForQualityReview(hook: string, script: string, maxChars = 900): string {
  const parts = [hook.trim(), script.trim()].filter(Boolean)
  const combined = parts.join('\n\n')
  if (combined.length <= maxChars) return combined
  return `${combined.slice(0, maxChars)}…`
}
